/* Tests run with node; no Home Assistant installation required. */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const src = fs.readFileSync(require('node:path').join(__dirname,'../dist/central-overview-card.js'),'utf8');
assert(!src.includes('--custom_'), 'Must not depend on custom theme variables');
assert(!src.includes('edelmann'), 'Must not include original installation-specific entities');
assert(!src.includes("icon:'local:"), 'Default icons must not depend on local icon packs');
assert(src.includes('ha-icon-picker'), 'Must provide native Home Assistant icon picker');
assert(src.includes('Version 1.0.3'), 'Editor must display Version 1.0.3');
assert(src.includes('data-card-version=\"1.0.3\"'), 'Card version must match');

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
is('lights','In 2 Räumen aktiv');
is('energy','1 Gerät aktiv');
is('heating','1 Raum heizen');
is('climate','1 Raum kühlen');
is('audio','Spielt in 1 Raum');
is('shading','1 offen · 1 zu');
is('media','1 Gerät aktiv');
is('air','1 Sensor prüfen!',{source:'selected',entities:['sensor.air_state']});
is('air','Grenzwert einstellen',{source:'selected',entities:['sensor.co2']});
is('air','1 Sensor prüfen!',{source:'selected',entities:['sensor.co2'],threshold:1000});
is('lock','Verriegelt');
is('alarmclock','1 Wecker aktiv',{source:'selected',entities:['switch.wakeup']});
is('presence','In 1 Raum aktiv');
is('people','1 Person anwesend');
is('vehicles','1 Fahrzeug fährt',{source:'selected',entities:['binary_sensor.car'],active_state:'off'});
is('automations','1 Automation aktiviert');
assert.equal(run('vehicles').missing,true,'Cars must not be guessed from entity names');
assert.equal(run('air').missing,true,'Air quality must not be guessed from entity names');
// A missing member must NOT make a window or shading overview look safe.
assert.equal(run('windows',{source:'selected',entities:['binary_sensor.bath_window','binary_sensor.missing']}).text,'1 Fenster unbekannt');
assert.equal(run('windows',{source:'selected',entities:['binary_sensor.kitchen_window','binary_sensor.missing']}).text,'1 geöffnet · 1 unbekannt');
assert.equal(run('windows',{source:'selected',entities:['binary_sensor.custom_sensor']}).missing,true);
assert.equal(run('shading',{source:'selected',entities:['cover.a','cover.not_found']}).text,'1 offen · 1 unbekannt');
assert.equal(run('shading',{source:'selected',entities:['cover.a','cover.b']}).text,'1 offen · 1 zu');
const groupRef=mk('group.windows_bad','on',{entity_id:['binary_sensor.bath_window','binary_sensor.missing']});
states[groupRef.entity_id]=groupRef;
assert.equal(run('windows',{source:'group',entity:groupRef.entity_id}).text,'1 Fenster unbekannt');
assert.equal(run('air',{source:'selected',entities:['sensor.co2'],threshold:'abc'}).text,'Grenzwert prüfen');
states['person.ada'].state='unknown';
assert.equal(run('people').text,'0 anwesend · 1 unbekannt');
states['person.ada'].state='home';
states['lock.back']=mk('lock.back','unlocked');
assert.equal(run('lock').text,'Eine Entität auswählen');
assert.equal(run('lock',{source:'selected',entities:['lock.front']}).text,'Verriegelt');
assert.equal(registry.has('central-overview-card-editor'),true);
assert.equal(windowStub.customCards[0].type,'central-overview-card');
console.log('PASS: 16 universal types, themes, group expansion, entity selection, main status calculations.');
