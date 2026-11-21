/* Tests run with node; no Home Assistant installation required. */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const src = fs.readFileSync(require('node:path').join(__dirname,'../dist/central-overview-card.js'),'utf8');
assert(!src.includes('--custom_'), 'Must not depend on custom theme variables');
assert(!src.includes('edelmann'), 'Must not include original installation-specific entities');
assert(!src.includes("icon:'local:"), 'Default icons must not depend on local icon packs');
assert(src.includes('ha-icon-picker'), 'Must provide native Home Assistant icon picker');
assert(src.includes('Version 1.0.5'), 'Editor must display Version 1.0.5');
assert(src.includes('data-card-version=\"1.0.5\"'), 'Card version must match');

const testSrc = src.replace(/\}\)\(\);\s*$/, 'window.__test = { compute, createConfig, resolveEntities, KINDS };})();');
const registry = new Map();
const windowStub = { customCards: [] };
vm.runInNewContext(testSrc, {
  window:windowStub, HTMLElement:class {},
  customElements:{get:(k)=>registry.get(k),define:(k,c)=>registry.set(k,c)},
  document:{createElement:(k)=>({type:k})},
  CustomEvent:class{},
}, {filename:'central-overview-card.js'});
const {compute, createConfig, KINDS}=windowStub.__test;
assert.equal(windowStub.customCards[0].name, 'MYHS Central Card');
assert.equal(Object.keys(KINDS).length,16);
const cfg=createConfig();
assert.equal(cfg.tiles.length,16);
assert.equal(cfg.columns,2);
assert.equal(cfg.tiles.find(t=>t.kind==='vehicles').source,'selected');
const mk = (entity_id,state,attributes={})=>({entity_id,state,attributes});
const states = {
  'alarm_control_panel.house':mk('alarm_control_panel.house','armed_away'),
  'binary_sensor.kitchen_window':mk('binary_sensor.kitchen_window','on',{device_class:'window'}),
  'binary_sensor.bath_window':mk('binary_sensor.bath_window','off',{device_class:'window'}),
  'light.a':mk('light.a','on'), 'light.b':mk('light.b','on'), 'light.c':mk('light.c','on'),
  'switch.kettle':mk('switch.kettle','on',{device_class:'outlet'}),
  'climate.radiator':mk('climate.radiator','heat',{hvac_modes:['off','heat']}),
  'climate.cooler':mk('climate.cooler','cool',{hvac_modes:['off','heat','cool']}),
  'media_player.speaker':mk('media_player.speaker','playing',{device_class:'speaker'}),
  'media_player.tv':mk('media_player.tv','on',{device_class:'tv'}),
  'cover.a':mk('cover.a','open',{current_position:100}),
  'cover.b':mk('cover.b','closed',{current_position:0}),
  'sensor.air_state':mk('sensor.air_state','schlecht'),
  'sensor.co2':mk('sensor.co2','1400'),
  'lock.front':mk('lock.front','locked'),
  'switch.wakeup':mk('switch.wakeup','on'),
  'binary_sensor.motion':mk('binary_sensor.motion','on',{device_class:'motion'}),
  'person.ada':mk('person.ada','home'),
  'person.ben':mk('person.ben','not_home'),
  'binary_sensor.car':mk('binary_sensor.car','off'),
  'automation.night':mk('automation.night','on'),
  'automation.day':mk('automation.day','off'),
  'group.windows':mk('group.windows','on',{entity_id:['binary_sensor.kitchen_window','binary_sensor.bath_window']}),
};
const hass = {states,entities:{
  'light.a':{area_id:'living'},'light.b':{area_id:'living'},'light.c':{area_id:'kitchen'},
  'binary_sensor.motion':{area_id:'living'},
}};
const run=(kind,opts={})=>compute(hass,{...cfg.tiles.find(t=>t.kind===kind),...opts});
const is = (kind,txt,opts={})=>assert.equal(run(kind,opts).text,txt,kind);
is('alarm','Scharf · Abwesend');
assert.equal(run('alarm').tone,'error');
states['alarm_control_panel.house'].state='disarmed';
is('alarm','Unscharf · Zuhause');
assert.equal(run('alarm').tone,'success');
states['alarm_control_panel.house'].state='armed_home';
assert.equal(run('alarm').text,'Scharf · Zuhause');
assert.equal(compute(hass,cfg.tiles[0],true).text,'Unscharf · Zuhause');
is('windows','1 geöffnet');
is('windows','1 geöffnet',{source:'group',entity:'group.windows'});
is('lights','2 Räume aktiv');
is('energy','1 Gerät aktiv');
is('heating','1 Raum heizen');
is('climate','1 Raum kühlen');
is('audio','Spielt in 1 Raum');
is('shading','1 offen · 1 geschlossen');
is('media','1 Gerät aktiv');
is('air','1 Sensor prüfen',{source:'selected',entities:['sensor.air_state']});
is('air','Grenzwert wählen',{source:'selected',entities:['sensor.co2']});
is('air','1 Sensor prüfen',{source:'selected',entities:['sensor.co2'],threshold:1000});
is('lock','Verriegelt');
is('alarmclock','1 Wecker aktiv',{source:'selected',entities:['switch.wakeup']});
is('presence','1 Raum aktiv');
is('people','1 anwesend');
is('vehicles','1 Fahrzeug fährt',{source:'selected',entities:['binary_sensor.car'],active_state:'off'});
is('automations','1 Automation aktiv');
assert.equal(run('vehicles').missing,true,'Cars must not be guessed from entity names');
assert.equal(run('air').missing,true,'Air quality must not be guessed from entity names');
// All user-approved short status messages.
is('energy','Keine Geräte aktiv',{source:'selected',entities:['automation.day']});
assert.equal(run('media',{source:'selected',entities:['media_player.tv']}).text,'1 Gerät aktiv');
states['media_player.tv'].state='off';
is('media','Alle Geräte aus',{source:'selected',entities:['media_player.tv']});
states['media_player.tv'].state='on';
states['media_player.speaker'].state='paused';
is('audio','Alle pausiert',{source:'selected',entities:['media_player.speaker']});
states['media_player.speaker'].state='playing';
is('vehicles','Alle Fahrzeuge parken',{source:'selected',entities:['binary_sensor.car'],active_state:'on'});
is('air','Raumluft ausgewogen',{source:'selected',entities:['sensor.air_state'],good_states:'schlecht'});
is('automations','Alle aktiv',{source:'selected',entities:['automation.night']});
// Unavailable and unknown entities are ignored (never counted or displayed).
assert.equal(run('windows',{source:'selected',entities:['binary_sensor.bath_window','binary_sensor.missing']}).text,'Alle geschlossen');
assert.equal(run('windows',{source:'selected',entities:['binary_sensor.kitchen_window','binary_sensor.missing']}).text,'1 geöffnet');
assert.equal(run('windows',{source:'selected',entities:['binary_sensor.custom_sensor']}).text,'Keine Daten');
assert.equal(run('shading',{source:'selected',entities:['cover.a','cover.not_found']}).text,'Alle offen');
assert.equal(run('shading',{source:'selected',entities:['cover.a','cover.b']}).text,'1 offen · 1 geschlossen');
const groupRef=mk('group.windows_bad','on',{entity_id:['binary_sensor.bath_window','binary_sensor.missing']});
states[groupRef.entity_id]=groupRef;
assert.equal(run('windows',{source:'group',entity:groupRef.entity_id}).text,'Alle geschlossen');
assert.equal(run('air',{source:'selected',entities:['sensor.co2'],threshold:'abc'}).text,'Grenzwert prüfen');
states['person.ada'].state='unknown';
assert.equal(run('people').text,'Alle abwesend');
states['person.ada'].state='home';
states['lock.back']=mk('lock.back','unlocked');
assert.equal(run('lock').text,'Entität wählen');
assert.equal(run('lock',{source:'selected',entities:['lock.front']}).text,'Verriegelt');
assert.equal(registry.has('central-overview-card-editor'),true);
assert.equal(windowStub.customCards[0].type,'central-overview-card');
// Missing entities never influence counts; only available states are used.
assert.equal(run('windows',{source:'selected',entities:['binary_sensor.bath_window','binary_sensor.missing']}).text,'Alle geschlossen');
assert.equal(run('shading',{source:'selected',entities:['cover.b','cover.not_found']}).text,'Alle geschlossen');
assert.equal(run('lights',{source:'selected',entities:['light.missing']}).text,'Keine Daten');
assert.equal(run('energy',{source:'selected',entities:['switch.missing']}).text,'Keine Daten');
assert.equal(run('vehicles',{source:'selected',entities:['binary_sensor.missing'],active_state:'off'}).text,'Keine Daten');
assert.equal(run('people',{source:'selected',entities:['person.ada']}).text,'1 anwesend');
assert.equal(run('people',{source:'selected',entities:['person.ben']}).text,'Alle abwesend');
assert.equal(run('audio',{source:'selected',entities:['media_player.speaker']}).text,'Spielt in 1 Raum');
assert.equal(run('media',{source:'selected',entities:['media_player.tv']}).text,'1 Gerät aktiv');
assert.equal(run('automations',{source:'selected',entities:['automation.day']}).text,'Alle inaktiv');
// Selecting one good alarm next to an unavailable one uses the good alarm.
states['alarm_control_panel.offline']=mk('alarm_control_panel.offline','unavailable');
assert.equal(run('alarm',{source:'selected',entities:['alarm_control_panel.house','alarm_control_panel.offline']}).text,'Scharf · Zuhause');
states['light.unavailable']=mk('light.unavailable','unavailable');
assert.equal(run('lights',{source:'selected',entities:['light.a','light.unavailable']}).text,'1 Raum aktiv');
for (const tile of cfg.tiles) {
  const r=run(tile.kind);
  assert(!/unbekannt|nicht verfügbar/i.test(r.text),`Unexpected unavailable/unknown label in ${tile.kind}`);
}
console.log('PASS: 16 short statuses, unknown/unavailable ignored, editor name/version, native themes and icons.');
