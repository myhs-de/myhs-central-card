/* MYHS Central Card | Version 1.0.5 | MIT | Home Assistant Lovelace | no dependencies */
(() => {
  'use strict';
  const TAG = 'central-overview-card';
  const EDITOR_TAG = 'central-overview-card-editor';
  if (customElements.get(TAG)) return;

  // Public, installation-independent defaults. No personal entity IDs or URLs.
  const KINDS = {
    alarm:       {label:'Sicherheit Zentral',  icon:'mdi:shield-home',       tone:'error',   source:'auto'},
    windows:     {label:'Fenster Zentral',     icon:'mdi:window-closed',     tone:'error',   source:'auto'},
    lights:      {label:'Licht Zentral',       icon:'mdi:lightbulb-group',   tone:'warning', source:'auto'},
    energy:      {label:'Energie Zentral',  icon:'mdi:power-plug',        tone:'success', source:'auto'},
    heating:     {label:'Heizung Zentral',     icon:'mdi:radiator',          tone:'orange',  source:'auto'},
    climate:     {label:'Klima Zentral',       icon:'mdi:air-conditioner',   tone:'info',    source:'auto'},
    audio:       {label:'Audio Zentral',       icon:'mdi:music',             tone:'cyan',    source:'auto'},
    shading:     {label:'Beschattung Zentral', icon:'mdi:blinds',            tone:'purple',  source:'auto'},
    media:       {label:'Media Zentral',   icon:'mdi:television',        tone:'info',    source:'auto'},
    air:         {label:'Lüftung Zentral',    icon:'mdi:air-filter',        tone:'success', source:'selected'},
    lock:        {label:'Zutritt Zentral',     icon:'mdi:lock',              tone:'success', source:'auto'},
    alarmclock:  {label:'Wecker Zentral',      icon:'mdi:alarm',             tone:'warning', source:'selected'},
    presence:    {label:'Präsenz Zentral',     icon:'mdi:motion-sensor',     tone:'pink',    source:'auto'},
    people:      {label:'Anwesenheit Zentral', icon:'mdi:account-group',    tone:'pink',    source:'auto'},
    vehicles:    {label:'Fahrzeuge Zentral',   icon:'mdi:car',               tone:'info',    source:'selected'},
    automations: {label:'Automatik Zentral',   icon:'mdi:robot',             tone:'warning', source:'auto'},
  };
  // All color references are native Home Assistant theme variables.
  const COLOR_VARS = {
    error:   'var(--error-color, var(--red-color, #f44336))',
    success: 'var(--success-color, var(--green-color, #4caf50))',
    warning: 'var(--warning-color, var(--amber-color, #ffc107))',
    info:    'var(--info-color, var(--blue-color, #2196f3))',
    orange:  'var(--orange-color, #ff9800)',
    cyan:    'var(--cyan-color, #00bcd4)',
    purple:  'var(--purple-color, #9c27b0)',
    pink:    'var(--pink-color, #e91e63)',
    red:     'var(--red-color, #f44336)',
    green:   'var(--green-color, #4caf50)',
    yellow:  'var(--yellow-color, #ffeb3b)',
    blue:    'var(--blue-color, #2196f3)',
    amber:   'var(--amber-color, #ffc107)',
  };
  const COLOR_LABELS = {error:'Fehler (Rot)', success:'Erfolg (Grün)', warning:'Warnung (Gelb)',
    info:'Info (Blau)', orange:'Orange', cyan:'Cyan', purple:'Lila', pink:'Pink',
    red:'Rot', green:'Grün', yellow:'Gelb', blue:'Blau', amber:'Amber'};
  const createTile = (kind) => ({kind, label:KINDS[kind].label, icon:KINDS[kind].icon,
    source:KINDS[kind].source, entities:[], enabled:true, navigation_path:'',
    tone:['alarm','lock'].includes(kind)?'auto':KINDS[kind].tone, include_zones:kind==='people'});
  const createConfig = () => ({type:`custom:${TAG}`, columns:2, gap:8, show_labels:true,
    alarm_home_legacy:false, tiles:Object.keys(KINDS).map(createTile)});
  const strings = (value) => Array.isArray(value) ? value.filter(v => typeof v === 'string') : [];
  const uniq = (items) => [...new Set(items.filter(Boolean))];
  // Accept all native mdi: icons and any optional, installed icon collection
  // Installed icon prefixes are managed by Home Assistant.
  // Existing mdi: defaults always work without additional icon packages.
  const isIconName = value => typeof value === 'string' &&
    /^[a-z][a-z0-9_-]*:[a-z0-9][a-z0-9._-]*$/i.test(value);
  const mdiIcon = (candidate, kind) =>
    isIconName(candidate) ? candidate : (KINDS[kind]?.icon || 'mdi:help-circle');
  const hasState = (entity) => Boolean(entity && typeof entity.state === 'string' &&
    entity.state.trim() !== '' && !['unknown','unavailable'].includes(entity.state.trim().toLowerCase()));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (x) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const countMessage = (n, singular, plural) => n === 1 ? singular : plural(n);
  const stateById = (hass, id) => hass?.states?.[id];
  function areaId(hass, id) {
    const meta = hass?.entities?.[id];
    return meta?.area_id || (meta?.device_id && hass?.devices?.[meta.device_id]?.area_id) ||
      stateById(hass,id)?.attributes?.area_id || null;
  }
  function groupChildren(hass, id, visited = new Set()) {
    if (!id || visited.has(id)) return [];
    visited.add(id);
    const st = stateById(hass,id);
    const members = st?.attributes?.entity_id;
    const ids = Array.isArray(members) ? members : (typeof members === 'string' ? members.split(',').map(s=>s.trim()) : []);
    // Preserve missing members so a stale group cannot look entirely safe.
    if (!ids.length) return [id];
    return uniq(ids.flatMap(child => groupChildren(hass,child,visited)));
  }
  function autoCandidate(kind, st) {
    const id = st.entity_id;
    const domain = id.split('.')[0];
    const deviceClass = String(st.attributes?.device_class || '').toLowerCase();
    const hvac = st.attributes?.hvac_modes || [];
    switch (kind) {
      case 'alarm':       return domain === 'alarm_control_panel';
      case 'windows':     return domain === 'binary_sensor' && ['window','opening'].includes(deviceClass);
      case 'lights':      return domain === 'light';
      case 'energy':      return domain === 'switch' && ['outlet','plug'].includes(deviceClass);
      case 'heating':     return domain === 'climate' && hvac.includes('heat') && !hvac.includes('cool');
      case 'climate':     return domain === 'climate' && hvac.includes('cool');
      case 'audio':       return domain === 'media_player' && ['speaker','receiver'].includes(deviceClass);
      case 'shading':     return domain === 'cover';
      case 'media':       return domain === 'media_player' && deviceClass === 'tv';
      case 'lock':        return domain === 'lock';
      case 'presence':    return domain === 'binary_sensor' && ['motion','presence','occupancy'].includes(deviceClass);
      case 'people':      return domain === 'person';
      case 'automations': return domain === 'automation';
      default:            return false; // Don't guess air quality, alarms, or vehicle movement.
    }
  }
  function resolveEntities(hass, tile) {
    const source = tile.source || KINDS[tile.kind]?.source || 'selected';
    let ids = [];
    if (source === 'group') ids = groupChildren(hass, tile.entity);
    else if (source === 'selected') ids = uniq(strings(tile.entities).length ? strings(tile.entities) : (tile.entity ? [tile.entity] : []));
    else {
      ids = ['alarm','lock'].includes(tile.kind) && tile.entity ? [tile.entity] :
        Object.values(hass?.states || {}).filter(st => autoCandidate(tile.kind,st)).map(st => st.entity_id);
      // Expand aggregation entities to their individual members so an open
      // window group doesn't hide the actual number of open windows.
      ids = uniq(ids.flatMap(id => {
        const e=stateById(hass,id);
        return e?.attributes?.entity_id ? groupChildren(hass,id) : [id];
      }));
    }
    if (tile.prefix) ids = ids.filter(id => id.startsWith(tile.prefix));
    if (tile.area) ids = ids.filter(id => areaId(hass,id) === tile.area);
    // Preserve configured identifiers; filter unavailable/unknown states when calculating.
    return uniq(ids).map(id => stateById(hass,id) || {entity_id:id,state:'unavailable',attributes:{}});
  }
  function activeCountByRooms(hass, arr) {
    const rooms = uniq(arr.map(st => areaId(hass,st.entity_id)));
    const withoutArea = arr.filter(st => !areaId(hass,st.entity_id)).length;
    return {count:rooms.length + withoutArea, rooms:rooms.length>0 && withoutArea===0};
  }
  function result(text, active=false, extra={}) {return {text, active, ...extra};}
  function compute(hass, tile, legacy=false) {
    const kind = tile.kind;
    // Completely ignore unavailable/unknown entities for every counter and status.
    const usable = resolveEntities(hass,tile).filter(hasState);
    const hasSelection = strings(tile.entities).length > 0 || Boolean(tile.entity);
    const needsSetup = ['air','alarmclock','vehicles'].includes(kind) && !hasSelection;
    if (!usable.length) return result(needsSetup?'Quelle wählen':'Keine Daten',false,{missing:true});

    if (kind === 'alarm' || kind === 'lock') {
      if (usable.length > 1) return result('Entität wählen',false,{missing:true});
      const s=usable[0].state;
      if (kind === 'alarm') {
        const names = {disarmed:'Unscharf · Zuhause',armed_home:legacy?'Unscharf · Zuhause':'Scharf · Zuhause',
          armed_away:'Scharf · Abwesend',armed_night:'Scharf · Nacht',armed_vacation:'Scharf · Urlaub',
          armed_holiday:'Scharf · Urlaub',pending:'Wird aktiviert',arming:'Wird aktiviert',
          disarming:'Wird deaktiviert',triggered:'Alarm ausgelöst'};
        const okay=legacy?s==='armed_home':s==='disarmed';
        const waiting=['pending','arming','disarming'].includes(s);
        return result(names[s]||'Status prüfen',!okay,
          {tone:okay?'success':waiting?'warning':'error',colorize:true});
      }
      const names = {locked:'Verriegelt',unlocked:'Entriegelt',locking:'Wird verriegelt',
        unlocking:'Wird entriegelt',jammed:'Blockiert'};
      const okay=s==='locked';
      return result(names[s]||'Status prüfen',!okay,
        {tone:s==='jammed'?'error':okay?'success':'warning',colorize:true,
         icon:s==='unlocked'?'mdi:lock-open-variant':s==='jammed'?'mdi:lock-alert':undefined});
    }
    if (kind === 'windows') {
      const open=usable.filter(st=>['on','open'].includes(st.state)).length;
      return result(open?countMessage(open,'1 geöffnet',n=>`${n} geöffnet`):'Alle geschlossen',open>0);
    }
    if (['lights','media','presence'].includes(kind)) {
      const on=usable.filter(st=>kind==='media'?
        ['on','playing','paused','idle'].includes(st.state):st.state==='on');
      const {count,rooms}=activeCountByRooms(hass,on);
      const offText=kind==='lights'?'Alles aus':kind==='media'?'Alle Geräte aus':'Keine Bewegung';
      const message=!count?offText:rooms?
        countMessage(count,'1 Raum aktiv',n=>`${n} Räume aktiv`):
        countMessage(count,'1 Gerät aktiv',n=>`${n} Geräte aktiv`);
      return result(message,count>0);
    }
    if (kind==='energy' || kind==='alarmclock') {
      const count=usable.filter(st=>['on','active'].includes(st.state)).length;
      const singular=kind==='energy'?'1 Gerät aktiv':'1 Wecker aktiv';
      const plural=kind==='energy'?'Geräte':'Wecker';
      const offText=kind==='energy'?'Keine Geräte aktiv':'Kein Wecker aktiv';
      return result(count?countMessage(count,singular,n=>`${n} ${plural} aktiv`):offText,count>0);
    }
    if (kind==='heating' || kind==='climate') {
      const modes=[{s:'heat',word:'heizen'},{s:'cool',word:'kühlen'},
        {s:'fan_only',word:'lüften'},{s:'heat_cool',word:'im Automatikmodus'},
        {s:'auto',word:'im Automatikmodus'}];
      const active=modes.map(m=>({...m,count:usable.filter(st=>st.state===m.s).length}))
        .filter(m=>m.count&&(kind==='climate'||m.s!=='fan_only'));
      if (!active.length) return result('Keine Räume aktiv',false);
      const text=active.map(m=>m.word==='im Automatikmodus'?
        `${m.count} im Automatikmodus`:
        `${m.count} ${m.count===1?'Raum':'Räume'} ${m.word}`).join(' · ');
      return result(text,true);
    }
    if (kind==='audio') {
      const playing=activeCountByRooms(hass,usable.filter(st=>st.state==='playing')).count;
      const paused=activeCountByRooms(hass,usable.filter(st=>st.state==='paused')).count;
      return result(playing?countMessage(playing,'Spielt in 1 Raum',n=>`Spielt in ${n} Räumen`):
        'Alle pausiert',playing>0);
    }
    if (kind==='shading') {
      const auto=tile.automation_entity&&stateById(hass,tile.automation_entity)?.state==='on';
      let open=0,closed=0,partial=0;
      for(const st of usable){
        const raw=st.attributes?.current_position;
        const pos=raw===null||raw===undefined||raw===''?NaN:Number(raw);
        if(Number.isFinite(pos)&&pos>=0&&pos<=100){
          if(pos===100)open++;else if(pos===0)closed++;else partial++;
        } else if(st.state==='open')open++;
        else if(st.state==='closed')closed++;
        else if(['opening','closing'].includes(st.state))partial++;
        // Other, unsupported states do not count as open or closed.

      }
      const words=[open?`${open} offen`:null,partial?`${partial} teilweise`:null,
        closed?`${closed} geschlossen`:null].filter(Boolean);
      const counted=open+closed+partial;
      if (!counted) return result('Keine Daten',false,{missing:true});
      const text=open===counted?'Alle offen':
        closed===counted?'Alle geschlossen':words.join(' · ');
      return result(text,Boolean(auto||closed||partial),
        {icon:auto?'mdi:blinds-horizontal':closed===counted?'mdi:blinds':'mdi:blinds-open'});
    }
    if (kind==='air') {
      const okay=(tile.good_states||'gut,good,ok,okay,ausgewogen').split(',')
        .map(s=>s.trim().toLowerCase());
      const threshold=tile.threshold===''||tile.threshold===undefined||tile.threshold===null?
        null:Number(tile.threshold);
      if(threshold!==null&&!Number.isFinite(threshold)) return result('Grenzwert prüfen',false,{missing:true});
      let noRule=false;
      const bad=usable.filter(st=>{
        const numeric=Number(st.state);
        if(Number.isFinite(numeric)&&st.state.trim()!==''&&threshold===null){noRule=true;return false;}
        if(Number.isFinite(numeric)&&st.state.trim()!==''&&threshold!==null)
          return tile.comparison==='below'?numeric<threshold:numeric>threshold;
        return !okay.includes(st.state.toLowerCase());
      });
      if(noRule&&threshold===null) return result('Grenzwert wählen',false,{missing:true});
      const {count,rooms}=activeCountByRooms(hass,bad);
      return result(!count?'Raumluft ausgewogen':rooms?
        countMessage(count,'1 Raum lüften',n=>`${n} Räume lüften`):
        countMessage(count,'1 Sensor prüfen',n=>`${n} Sensoren prüfen`),count>0);
    }
    if (kind==='people') {
      const home=usable.filter(st=>st.state==='home'||(tile.include_zones&&st.state!=='not_home'));
      const count=home.length;
      return result(count?countMessage(count,'1 anwesend',n=>`${n} anwesend`):'Alle abwesend',count>0);
    }
    if (kind==='vehicles') {
      const wanted=(tile.active_state||'on').toLowerCase();
      const moving=usable.filter(st=>st.state.toLowerCase()===wanted).length;
      return result(moving?countMessage(moving,'1 Fahrzeug fährt',n=>`${n} Fahrzeuge fahren`):'Alle Fahrzeuge parken',moving>0);
    }
    if (kind==='automations') {
      const count=usable.filter(st=>st.state==='on').length;
      const allOn=count===usable.length;
      return result(!count?'Alle inaktiv':allOn?'Alle aktiv':
        countMessage(count,'1 Automation aktiv',n=>`${n} Automationen aktiv`),count>0);
    }
    return result('Kachel prüfen',false,{missing:true});
  }

  const CARD_CSS = `
    :host {display:block;}
    ha-card {background:transparent; border:0; box-shadow:none; padding:0; overflow:visible;}
    .grid {display:grid; grid-template-columns:repeat(var(--co-columns, 2),minmax(0,1fr));
      gap:var(--co-gap,8px);}
    button.tile {box-sizing:border-box; appearance:none; -webkit-appearance:none; font:inherit;
      font-family:var(--primary-font-family,inherit); text-align:left;
      display:grid; grid-template-rows:30px minmax(26px,auto) 18px;
      align-content:center; justify-items:start; row-gap:1px;
      padding:10px 11px; min-width:0; width:100%; min-height:102px;
      /* Kein sichtbarer Rahmen, keine Akzent-Linien an den Rändern. */
      border:0 !important;
      overflow:hidden;
      position:relative; isolation:isolate;
      background-clip:padding-box;
      border-radius:var(--ha-card-border-radius,12px);
      color:var(--primary-text-color);
      background:var(--ha-card-background,var(--card-background-color,#fff));
      box-shadow:none !important;
      cursor:default;
      transition:box-shadow .18s ease, border-color .18s ease, background .18s ease, transform .18s ease;
    }
    button.tile.clickable {cursor:pointer;}
    button.tile.clickable:hover {transform:translateY(-1px);
      box-shadow:none;}
    button.tile.clickable:active {transform:translateY(0);}
    button.tile:focus-visible {outline:2px solid var(--primary-color); outline-offset:2px;}
    /* Original gradient on an independent layer, not on the button border.
       The overlay fades smoothly to 0 near the right/bottom edge (iOS Safari).
       Intersect both masks: neither side can produce a colored hairline. */
    button.tile.colored::before {
      content:''; position:absolute; inset:0; z-index:0;
      border-radius:inherit; pointer-events:none;
      background:linear-gradient(135deg,
        color-mix(in srgb,var(--tile-color) 32%, transparent) 0%,
        color-mix(in srgb,var(--tile-color) 32%, transparent) 14%,
        transparent 68%);
      -webkit-mask-image:
        linear-gradient(to right,#000 0%,#000 calc(100% - 12px),transparent 100%),
        linear-gradient(to bottom,#000 0%,#000 calc(100% - 12px),transparent 100%);
      mask-image:
        linear-gradient(to right,#000 0%,#000 calc(100% - 12px),transparent 100%),
        linear-gradient(to bottom,#000 0%,#000 calc(100% - 12px),transparent 100%);
      -webkit-mask-composite:source-in;
      mask-composite:intersect;
    }
    button.tile > * {position:relative; z-index:1;}
    .icon {box-sizing:border-box; height:30px; width:30px; display:flex;
      align-items:center; justify-content:flex-start;
      color:var(--tile-fg,var(--secondary-text-color));}
    ha-icon {--mdc-icon-size:25px; width:25px; height:25px;}
    .state {color:var(--tile-fg,var(--secondary-text-color));
      font-size:16px; line-height:26px; font-weight:700;
      width:100%; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
    .label {color:var(--primary-text-color); font-size:13px; line-height:18px;
      opacity:.8; width:100%; min-width:0;
      overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
    button.tile:not(:has(.label)) {grid-template-rows:30px minmax(26px,auto); min-height:82px;}
    .empty {padding:16px;color:var(--secondary-text-color);font-size:13px;}
    @media (prefers-reduced-motion:reduce) {
      button.tile {transition:none;}
      button.tile.clickable:hover {transform:none;}
    }
  `;
  class CentralOverviewCard extends HTMLElement {
    constructor() {super();this.attachShadow({mode:'open'});this._config=null;this._hass=null;this._rendered=false;}
    static getStubConfig() {const {type, ...config} = createConfig(); return config;}
    static getConfigElement() {return document.createElement(EDITOR_TAG);}
    getCardSize() {
      const n=(this._config?.tiles || []).filter(t=>t.enabled!==false && KINDS[t.kind]).length;
      const cols=Math.max(1,Math.min(4,Number(this._config?.columns)||2));
      return Math.max(1,Math.ceil((Math.ceil(n/cols)*110 + 8)/50));
    }
    getGridOptions() {return {columns:12,rows:'auto'};}
    setConfig(config) {
      if (!config || !Array.isArray(config.tiles)) {
        if (config && !config.tiles) config={...createConfig(),...config};
        else throw new Error('central-overview-card: tiles muss eine Liste sein.');
      }
      this._config={...createConfig(),...config,tiles:config.tiles.map(t=>({...t,icon:mdiIcon(t.icon,t.kind)}))};
      this._update();
    }
    set hass(hass) {this._hass=hass;this._update();}
    get hass() {return this._hass;}
    _update() {
      if (!this._config) return;
      if (!this._rendered) {
        this.shadowRoot.innerHTML=`<style>${CARD_CSS}</style><ha-card data-card-version="1.0.5"><div class="grid"></div></ha-card>`;
        this.shadowRoot.querySelector('.grid').addEventListener('click',(ev)=>{
          const btn=ev.target.closest('button.tile');
          if (!btn) return;
          const i=Number(btn.dataset.index), tile=this._config.tiles[i];
          if (!tile?.navigation_path || !btn.classList.contains('clickable')) return;
          const path=String(tile.navigation_path).trim();
          // Limit navigation to local dashboard URLs/anchors.
          if (!path || !(path.startsWith('/') || path.startsWith('#')) || path.startsWith('//')) return;
          history.pushState(null,'',path);
          window.dispatchEvent(new Event('location-changed'));
        });
        this._rendered=true;
      }
      const grid=this.shadowRoot.querySelector('.grid');
      grid.style.setProperty('--co-columns',String(Math.max(1,Math.min(4,Number(this._config.columns)||2))));
      grid.style.setProperty('--co-gap',`${Math.max(0,Math.min(40,Number(this._config.gap) || 0))}px`);
      if (!this._hass) {grid.innerHTML='<div class="empty">Home Assistant verbindet …</div>';return;}
      const enabled=this._config.tiles.map((t,i)=>({t,i})).filter(({t})=>t.enabled!==false && KINDS[t.kind]);
      if (!enabled.length) {grid.innerHTML='<div class="empty">Keine Kacheln ausgewählt.</div>';return;}
      grid.innerHTML=enabled.map(({t,i})=>{
        const status=compute(this._hass,t,Boolean(this._config.alarm_home_legacy));
        const selectedTone=t.tone && t.tone!=='auto' ? t.tone : (status.tone || KINDS[t.kind].tone);
        const color=COLOR_VARS[selectedTone] || COLOR_VARS.info;
        const colored=status.colorize || status.active;
        const textTone=colored ? color : 'var(--secondary-text-color)';
        // The user-selected icon always wins. Automatic state icons are only used
        // while the tile still uses its original default symbol.
        const customIcon=Boolean(t.icon && t.icon!==KINDS[t.kind].icon);
        const icon=mdiIcon(customIcon ? t.icon : (status.icon || t.icon),t.kind);
        const label=t.label === undefined ? KINDS[t.kind].label : t.label;
        const navigable=typeof t.navigation_path==='string' &&
          (t.navigation_path.startsWith('#') || (t.navigation_path.startsWith('/') && !t.navigation_path.startsWith('//')));
        const aria=`${label}: ${status.text}`;
        return `<button type="button" class="tile ${colored?'colored':''} ${navigable?'clickable':''}"
          data-index="${i}" style="--tile-color:${color};--tile-fg:${textTone}" aria-label="${esc(aria)}">
          <div class="icon"><ha-icon icon="${esc(icon)}"></ha-icon></div>
          <div class="state" title="${esc(status.text)}">${esc(status.text)}</div>
          ${this._config.show_labels!==false ? `<div class="label" title="${esc(label)}">${esc(label)}</div>`:''}
        </button>`;
      }).join('');
    }
  }

  /* Visual editor: distinct edit and visibility controls with a simple layout. */
  const EDIT_CSS = `
    :host {display:block;color:var(--primary-text-color);font-family:var(--primary-font-family,inherit);}
    * {box-sizing:border-box;}
    .editor {display:grid;gap:15px;}
    .intro {display:flex;align-items:center;gap:11px;padding:4px 0 1px;}
    .brand-icon {display:flex;align-items:center;justify-content:center;flex:none;width:43px;height:43px;
      border-radius:12px;background:var(--secondary-background-color,var(--card-background-color,#fff));
      color:var(--primary-color,#03a9f4);}
    .brand-icon ha-icon {--mdc-icon-size:23px;}
    .intro-copy {min-width:0;flex:1;}
    .intro h3 {font-size:16px;line-height:1.3;margin:0 0 2px;font-weight:700;}
    .intro p {margin:0;font-size:12px;color:var(--secondary-text-color);line-height:1.45;}
    .version {font-size:11px;font-weight:600;white-space:nowrap;border-radius:20px;padding:5px 8px;
      color:var(--secondary-text-color);background:var(--secondary-background-color,var(--card-background-color,#fff));}
    details {min-width:0;}
    details.settings,.tile-item {border:1px solid var(--divider-color,#ddd);
      border-radius:12px;background:var(--ha-card-background,var(--card-background-color,#fff));overflow:hidden;}
    details.settings>summary {list-style:none;cursor:pointer;outline-offset:3px;}
    details.settings>summary::-webkit-details-marker {display:none;}
    details.settings>summary {display:flex;align-items:center;gap:11px;padding:13px 14px;}
    details.settings>summary:hover {background:var(--secondary-background-color,transparent);}
    .settings-icon {color:var(--secondary-text-color);display:flex;}
    .settings-icon ha-icon {--mdc-icon-size:21px;}
    .settings-summary {flex:1;min-width:0;display:grid;gap:3px;}
    .settings-summary strong {font-size:13px;}
    .settings-summary small {font-size:11px;color:var(--secondary-text-color);}
    .chevron {font-size:19px;line-height:1;color:var(--secondary-text-color);flex:none;display:inline-block;
      transition:transform .15s ease;transform:rotate(90deg);}
    details[open]>summary .chevron {transform:rotate(-90deg);}
    .settings-body {border-top:1px solid var(--divider-color,#ddd);padding:15px;display:grid;gap:14px;}
    .section-heading {display:flex;align-items:baseline;gap:6px;margin:0 0 11px;}
    .section-heading strong {font-size:13px;font-weight:700;}
    .section-heading small {font-size:11px;color:var(--secondary-text-color);}
    .fields {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start;}
    .control {display:flex;flex-direction:column;gap:6px;font-size:12px;
      color:var(--secondary-text-color);min-width:0;}
    .control.wide,.wide {grid-column:1 / -1;}
    input,select {width:100%;min-width:0;min-height:40px;border:1px solid var(--divider-color,#d1d5db);
      border-radius:9px;padding:9px 10px;background:var(--card-background-color,var(--ha-card-background,#fff));
      color:var(--primary-text-color);font:inherit;font-size:13px;}
    input:focus,select:focus {outline:2px solid var(--primary-color,#03a9f4);outline-offset:1px;}
    input[type=checkbox] {width:18px;min-width:18px;min-height:18px;height:18px;margin:0;
      accent-color:var(--primary-color,#03a9f4);}
    .check {display:flex;align-items:center;gap:9px;font-size:13px;color:var(--primary-text-color);cursor:pointer;}
    .check.wide {grid-column:1 / -1;}
    .check-subtext {font-size:11px;color:var(--secondary-text-color);margin:4px 0 0 27px;}
    ha-entity-picker,ha-selector.icon-selector {display:block;width:100%;min-height:40px;}
    /* Home Assistant's official icon selector loads the complete MDI icon
       index and any installed icon collections. Fall back to the direct picker
       on older frontends and to the text field if neither has been loaded. */
    ha-selector.icon-selector:not(:defined) {display:none;}
    ha-icon-picker.icon-picker-fallback {display:none;width:100%;min-height:40px;}
    ha-selector.icon-selector:not(:defined) + ha-icon-picker.icon-picker-fallback:defined {display:block;}
    .tiles-title {display:flex;justify-content:space-between;align-items:center;gap:10px;}
    .tiles-title h3 {margin:0;font-size:15px;}
    .tiles-title p {margin:3px 0 0;color:var(--secondary-text-color);font-size:12px;}
    .count-badge {background:var(--secondary-background-color,var(--card-background-color,#fff));
      color:var(--secondary-text-color);font-size:12px;padding:6px 10px;border-radius:18px;white-space:nowrap;}
    .editor-tools {display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
    .editor-tools input {flex:1 1 170px;min-height:39px;}
    .history-actions {display:flex;gap:6px;flex:none;}
    .history-actions button {min-width:0;min-height:39px;padding:7px 9px;font-size:12px;}
    .tile-list {display:grid;gap:8px;}
    .tile-item {min-width:0;}
    .tile-item.expanded {border-color:var(--primary-color,#03a9f4);}
    .tile-item[hidden] {display:none !important;}
    .tile-head {display:flex;align-items:stretch;gap:5px;padding:6px;}
    /* The edit button and visibility button are independent click targets.
       No native <details> toggle or overlaid button is involved. */
    button.tile-expand {appearance:none;border:0;background:transparent;min-width:0;flex:1;
      min-height:49px;display:flex;align-items:center;gap:9px;padding:5px 7px;
      text-align:left;border-radius:9px;color:var(--primary-text-color);}
    button.tile-expand:hover,button.tile-expand:focus-visible {background:var(--secondary-background-color,rgba(0,0,0,.04));}
    .tile-expand .expand-action {display:flex;align-items:center;gap:3px;flex:none;
      padding:6px 7px;border:1px solid var(--divider-color,#ddd);border-radius:8px;
      color:var(--primary-color,#03a9f4);font-size:12px;font-weight:700;line-height:1;}
    .tile-expand .expand-arrow {font-size:19px;line-height:14px;font-weight:700;}
    .tile-item.expanded .expand-action {background:var(--secondary-background-color,rgba(0,0,0,.04));}
    .tile-item.is-off .tile-symbol,.tile-item.is-off .tile-text {opacity:.58;}
    button.quick-visibility {appearance:none;position:static;min-width:43px;width:43px;
      min-height:49px;height:auto;display:flex;align-items:center;justify-content:center;
      flex:none;border:1px solid var(--divider-color,#ddd);border-radius:9px;
      background:var(--secondary-background-color,var(--card-background-color,#fff));
      color:var(--primary-color,#03a9f4);cursor:pointer;padding:6px;}
    button.quick-visibility ha-icon {--mdc-icon-size:22px;}
    button.quick-visibility.is-off {color:var(--secondary-text-color);background:transparent;}
    button.quick-visibility:focus-visible {outline:2px solid var(--primary-color);outline-offset:1px;}
    .tile-symbol {display:flex;align-items:center;justify-content:center;flex:none;width:36px;height:36px;border-radius:10px;
      color:var(--tile-accent,var(--secondary-text-color));background:var(--secondary-background-color,rgba(0,0,0,.04));}
    .tile-symbol ha-icon {--mdc-icon-size:20px;}
    .tile-text {min-width:0;display:grid;gap:3px;flex:1;}
    .tile-text strong {font-size:13px;line-height:1.35;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .tile-text small {font-size:11px;line-height:1.3;color:var(--secondary-text-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .icon-help {font-size:11px;color:var(--secondary-text-color);margin:0;line-height:1.5;}
    .input-with-preview {display:flex;gap:9px;align-items:center;}
    .input-with-preview input {flex:1;min-width:0;}
    .input-with-preview ha-icon {color:var(--secondary-text-color);--mdc-icon-size:24px;}
    ha-entity-picker:not(:defined) {display:none;}
    .manual-entity {margin-top:7px;}
    .edit-body {display:grid;gap:16px;padding:15px;border-top:1px solid var(--divider-color,#ddd);}
    .edit-body[hidden] {display:none !important;}
    .edit-section + .edit-section {border-top:1px solid var(--divider-color,#ddd);padding-top:15px;}
    .hint {font-size:11px;line-height:1.5;margin:6px 0 0;color:var(--secondary-text-color);}
    .entity-list {display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;}
    .chip {max-width:100%;display:inline-flex;align-items:center;gap:7px;border-radius:8px;
      padding:5px 6px 5px 9px;background:var(--secondary-background-color,#eee);font-size:11px;overflow-wrap:anywhere;}
    .chip button {border:0;background:transparent;color:inherit;font-weight:700;padding:2px 5px;min-height:22px;}
    .add-row {display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end;}
    button {font:inherit;font-size:12px;font-weight:600;min-height:35px;padding:7px 10px;
      border:1px solid var(--divider-color,#ddd);border-radius:9px;
      background:var(--secondary-background-color,var(--card-background-color,#fff));color:var(--primary-text-color);cursor:pointer;}
    button:disabled {opacity:.35;cursor:not-allowed;}
    button.primary {background:var(--primary-color,#039be5);color:var(--text-primary-color,#fff);border:0;}
    .edit-actions {display:flex;flex-wrap:wrap;gap:7px;align-items:center;}
    .edit-actions .spacer {flex:1;}
    button.remove {color:var(--error-color,var(--red-color,#d22));}
    .add-panel {display:grid;gap:9px;padding:14px;border:1px dashed var(--divider-color,#bbb);border-radius:12px;}
    .add-panel strong {font-size:13px;}
    .add-controls {display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;}
    .footer-note {font-size:11px;line-height:1.55;color:var(--secondary-text-color);margin:0;}
    .no-results {border:1px dashed var(--divider-color,#ddd);border-radius:10px;padding:15px;
      color:var(--secondary-text-color);font-size:12px;text-align:center;}
    .advanced {padding-top:8px;}
    .advanced summary {cursor:pointer;color:var(--secondary-text-color);font-size:12px;}
    .advanced .check {margin-top:10px;}
    @media (max-width:440px) {.version {padding:4px 6px;} .edit-actions button {flex:1;}
      .tile-expand .expand-action {padding:7px 4px;}
      .editor-tools input {flex-basis:100%;} }
    @media (max-width:345px) {.fields {grid-template-columns:1fr;} .tile-expand .expand-action span {display:none;}
      .add-controls {grid-template-columns:1fr;}}
    @media (prefers-reduced-motion:reduce) {.chevron {transition:none;}}
  `;
  const sourceLabels={auto:'Automatische Erkennung',selected:'Entitäten auswählen',group:'Gruppe / Helfer'};
  // The visual editor uses one event dispatcher for its lifetime. Each update
  // creates a fresh, independent config object: Home Assistant never receives
  // an object which we will mutate later. This also makes Undo/Redo reliable.
  const cloneConfig = (cfg) => JSON.parse(JSON.stringify(cfg));
  class CentralOverviewEditor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode:'open'});
      this._config=null;
      this._hass=null;
      this._openTile=null;
      this._settingsOpen=false;
      this._advancedOpen=false;
      this._searchQuery='';
      this._undoStack=[];
      this._redoStack=[];
      this._syncingPickers=false;
      this.shadowRoot.addEventListener('click',e=>this._click(e));
      this.shadowRoot.addEventListener('change',e=>this._change(e));
      this.shadowRoot.addEventListener('value-changed',e=>this._pickerChanged(e));
      this.shadowRoot.addEventListener('input',e=>this._input(e));
      this.shadowRoot.addEventListener('keydown',e=>this._keyDown(e));
      this.shadowRoot.addEventListener('toggle',e=>this._toggled(e),true);
    }
    setConfig(incoming) {
      if (!incoming || typeof incoming !== 'object') return;
      const next={...createConfig(),...cloneConfig(incoming),tiles:Array.isArray(incoming.tiles)
        ? incoming.tiles.map(t=>({...cloneConfig(t), entities:strings(t.entities)}))
        : createConfig().tiles};
      // Ignore HA's echo of the config we just dispatched. External changes
      // (including a HA dashboard undo) are accepted even if we've edited before.
      if(this._config && JSON.stringify(next)===JSON.stringify(this._config)) return;
      if(this._config){this._undoStack=[];this._redoStack=[];}
      this._config=next;
      this._render();
    }
    set hass(hass){
      const first=!this._hass;
      this._hass=hass;
      if(first && this._config) this._render();
      else this.shadowRoot.querySelectorAll('ha-entity-picker, ha-selector[data-field="icon"]').forEach(el=>{el.hass=hass;});
    }
    get hass(){return this._hass;}
    _commit(mutator,{resetFilter=false,openIndex=undefined}={}){
      if(!this._config) return;
      const previous=cloneConfig(this._config);
      const next=cloneConfig(this._config);
      mutator(next);
      if(JSON.stringify(next)===JSON.stringify(previous)) return;
      this._undoStack.push(previous);
      if(this._undoStack.length>60) this._undoStack.shift();
      this._redoStack=[];
      this._config=next;
      if(resetFilter){this._searchQuery='';}
      if(openIndex!==undefined) this._openTile=openIndex;
      this._publish();
    }
    _publish(){
      // Render first; HA's immediate config echo then sees an equal value.
      this._render();
      this.dispatchEvent(new CustomEvent('config-changed',{
        bubbles:true,composed:true,detail:{config:cloneConfig(this._config)}
      }));
    }
    _history(direction){
      const from=direction==='undo'?this._undoStack:this._redoStack;
      const to=direction==='undo'?this._redoStack:this._undoStack;
      if(!from.length)return;
      to.push(cloneConfig(this._config));
      this._config=from.pop();
      this._searchQuery='';
      if(this._openTile!==null && this._openTile>=this._config.tiles.length)this._openTile=null;
      this._publish();
    }
    _tileUpdate(i,field,value){
      const old=this._config?.tiles?.[i];if(!old)return;
      if(field==='icon'){
        value=String(value??'').trim().toLowerCase();
        if(!isIconName(value))return;
      }
      const structural=['kind','source'].includes(field);
      this._commit(cfg=>{
        const t=cfg.tiles[i];
        t[field]=value;
        if(field==='kind' && KINDS[value]){
          const oldDefaults=KINDS[old.kind]||{}, defaults=KINDS[value];
          if(!old.label||old.label===oldDefaults.label)t.label=defaults.label;
          if(!old.icon||old.icon===oldDefaults.icon)t.icon=defaults.icon;
          if(!old.tone||old.tone===oldDefaults.tone||old.tone==='auto')
            t.tone=['alarm','lock'].includes(value)?'auto':defaults.tone;
          if(old.source===oldDefaults.source)t.source=defaults.source;
          t.entities=[];delete t.entity;
        }
      },{openIndex:structural?i:undefined});
    }
    _applyFilter(){
      if(!this._config)return;
      const q=this._searchQuery.trim().toLocaleLowerCase('de');let found=0;
      this.shadowRoot.querySelectorAll('.tile-item').forEach(el=>{
        const t=this._config.tiles[Number(el.dataset.i)];if(!t)return;
        const meta=KINDS[t.kind]||{};
        const matchText=`${t.label||''} ${meta.label||''} ${t.kind} ${sourceLabels[t.source||meta.source]||''}`;
        const match=matchText.toLocaleLowerCase('de').includes(q);
        el.hidden=!match;if(match)found++;
      });
      const empty=this.shadowRoot.querySelector('#empty-filter');if(empty)empty.hidden=found>0;
      const count=this.shadowRoot.querySelector('#filter-count');
      if(count)count.textContent=`${found} von ${this._config.tiles.length} Kacheln`;
    }
    _click(e){
      const btn=e.target.closest?.('button');if(!btn || !this._config)return;
      const action=btn.dataset.action;
      const row=btn.closest('.tile-item');
      const index=row?Number(row.dataset.i):-1;
      // The eye and expand button are independent; neither nests in a summary.
      if(action==='toggle-enabled' && index>=0){
        e.preventDefault();e.stopPropagation();
        this._commit(cfg=>{cfg.tiles[index].enabled=cfg.tiles[index].enabled===false;});return;
      }
      if(action==='expand-tile' && index>=0){
        e.preventDefault();
        this._openTile=this._openTile===index?null:index;
        this._render();
        return;
      }
      if(btn.id==='undo'){this._history('undo');return;}
      if(btn.id==='redo'){this._history('redo');return;}
      if(btn.id==='add-tile'){
        const kind=this.shadowRoot.querySelector('#new-kind')?.value;
        if(!KINDS[kind])return;
        const at=this._config.tiles.length;
        this._commit(cfg=>cfg.tiles.push(createTile(kind)),{openIndex:at,resetFilter:true});return;
      }
      if(index<0)return;
      if(action==='reset-tile'){
        const kind=this._config.tiles[index].kind;
        this._commit(cfg=>{cfg.tiles[index]={...createTile(kind),enabled:true};},
          {openIndex:index,resetFilter:true});return;
      }
      if(action==='remove-entity'){
        const j=Number(btn.dataset.j);
        this._commit(cfg=>{cfg.tiles[index].entities=strings(cfg.tiles[index].entities)
          .filter((_,n)=>n!==j);},{openIndex:index});return;
      }
      if(action==='add-entity'){
        const picker=row.querySelector('ha-entity-picker[data-field="new-entity"]');
        const typed=row.querySelector('input[data-field="manual-entity"]')?.value?.trim()||'';
        const id=typed||picker?.dataset.pending||picker?.value||'';
        if(!/^[a-z0-9_]+\.[a-z0-9_]+$/i.test(id))return;
        this._commit(cfg=>{cfg.tiles[index].entities=uniq([...strings(cfg.tiles[index].entities),id]);},
          {openIndex:index});return;
      }
      if(action==='duplicate'){
        this._commit(cfg=>cfg.tiles.splice(index+1,0,cloneConfig(cfg.tiles[index])),
          {openIndex:index+1,resetFilter:true});return;
      }
      if(action==='delete'){
        this._commit(cfg=>cfg.tiles.splice(index,1),{openIndex:null,resetFilter:true});return;
      }
      if(action==='up' && index>0){
        this._commit(cfg=>{[cfg.tiles[index],cfg.tiles[index-1]]=[cfg.tiles[index-1],cfg.tiles[index]];},
          {openIndex:index-1,resetFilter:true});return;
      }
      if(action==='down' && index<this._config.tiles.length-1){
        this._commit(cfg=>{[cfg.tiles[index],cfg.tiles[index+1]]=[cfg.tiles[index+1],cfg.tiles[index]];},
          {openIndex:index+1,resetFilter:true});return;
      }
    }
    _change(e){
      const el=e.target;
      if(!this._config||['ha-icon-picker','ha-entity-picker','ha-selector'].includes(el.localName))return;
      const global=el.dataset?.global;
      if(global){
        let value=el.type==='checkbox'?el.checked:el.value;
        if(global==='columns')value=Math.max(1,Math.min(4,Number(value)||2));
        if(global==='gap')value=Math.max(0,Math.min(40,Number(value)||0));
        this._commit(cfg=>{cfg[global]=value;});return;
      }
      const field=el.dataset?.field;
      if(!field||['manual-entity','new-entity'].includes(field))return;
      const row=el.closest('.tile-item');if(!row)return;
      const i=Number(row.dataset.i);
      const value=el.type==='checkbox'?el.checked:el.value;
      this._tileUpdate(i,field,value);
    }
    _pickerChanged(e){
      const el=e.target;
      if(this._syncingPickers||!this._config||
          !['ha-icon-picker','ha-entity-picker','ha-selector'].includes(el.localName))return;
      e.stopPropagation();
      const row=el.closest('.tile-item');if(!row)return;
      const value=e.detail?.value||'';
      if(el.dataset.field==='new-entity'){
        el.dataset.pending=value;return;
      }
      this._tileUpdate(Number(row.dataset.i),el.dataset.field,value);
    }
    _input(e){
      if(e.target.id==='tile-search'){
        this._searchQuery=e.target.value;this._applyFilter();
      }
      // Other settings commit on "change" (blur/selection), not on every
      // keystroke: the editor never discards the field while it is being typed.
    }
    _keyDown(e){
      if(e.key!=='Enter')return;
      if(e.target.matches?.('input[data-field="manual-entity"]')){
        e.preventDefault();
        e.target.closest('.tile-item')?.querySelector('button[data-action="add-entity"]')?.click();
      }
    }
    _toggled(e){
      if(!this._config)return;
      const d=e.target;if(!d.matches?.('details'))return;
      if(d.classList.contains('settings'))this._settingsOpen=d.open;
      else if(d.classList.contains('advanced'))this._advancedOpen=d.open;
    }
    _render() {
      if(!this._config) return;
      const cfg=this._config;
      const areas=Object.values(this._hass?.areas||{}).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
      const option=(value,label,current)=>`<option value="${esc(value)}" ${String(value)===String(current)?'selected':''}>${esc(label)}</option>`;
      const editorTile=(tile,i)=>{
        const k=KINDS[tile.kind]||KINDS.lights;
        const mode=tile.source||k.source;
        const enabled=tile.enabled!==false;
        const isSelected=mode==='selected',isGroup=mode==='group';
        const displayName=tile.label??k.label;
        const tone=tile.tone==='auto'?k.tone:(tile.tone||k.tone);
        const color=COLOR_VARS[tone]||COLOR_VARS.info;
        const sourceDetail=isSelected?`${strings(tile.entities).length} ausgewählt`:
          isGroup?'Gruppe / Helfer':'Automatisch';
        const advancedFields=[];
        if(tile.kind==='shading')advancedFields.push(`<div class="control wide"><span>Automatik-Entität (optional)</span><ha-entity-picker data-field="automation_entity" value="${esc(tile.automation_entity||'')}"></ha-entity-picker>
          <input data-field="automation_entity" value="${esc(tile.automation_entity||'')}" aria-label="Automatik Entitäts-ID manuell" placeholder="Entitäts-ID eingeben"></div>`);
        if(tile.kind==='air')advancedFields.push(`<label class="control wide">Gute Zustände (durch Komma trennen)
           <input data-field="good_states" value="${esc(tile.good_states??'gut,good,ok,okay,ausgewogen')}"></label>
           <label class="control">Grenzwert für Zahlensensoren
           <input type="number" step="any" data-field="threshold" value="${esc(tile.threshold??'')}"></label>
           <label class="control">Warnung bei<select data-field="comparison">${option('above','Wert größer als',tile.comparison||'above')}${option('below','Wert kleiner als',tile.comparison||'above')}</select></label>`);
        if(tile.kind==='vehicles')advancedFields.push(`<label class="control wide">Zustand, der „fährt“ bedeutet
          <input data-field="active_state" value="${esc(tile.active_state||'on')}" placeholder="on"></label>`);
        if(tile.kind==='people')advancedFields.push(`<label class="check wide"><input type="checkbox" data-field="include_zones" ${tile.include_zones?'checked':''}>Personen in anderen Zonen als anwesend zählen</label>`);
        const selectedFields=isSelected?`<div class="wide"><span class="control">Ausgewählte Entitäten</span>
          <div class="entity-list">${strings(tile.entities).map((id,j)=>`<span class="chip">${esc(id)}<button type="button" data-action="remove-entity" data-j="${j}" title="Entität entfernen" aria-label="${esc(id)} entfernen">×</button></span>`).join('')}</div>
          <div class="add-row"><ha-entity-picker data-field="new-entity" allow-custom-entity></ha-entity-picker>
          <button type="button" data-action="add-entity">+ Hinzufügen</button></div>
          <input class="manual-entity" data-field="manual-entity" aria-label="Entitäts-ID manuell eingeben"
            placeholder="Alternativ Entitäts-ID eingeben (z. B. light.wohnzimmer)" spellcheck="false">
          <p class="hint">Entität aus dem Menü wählen oder eine Entitäts-ID eingeben und auf „Hinzufügen“ tippen.</p></div>`:'';
        return `<div class="tile-item ${enabled?'':'is-off'} ${this._openTile===i?'expanded':''}" data-i="${i}">
          <div class="tile-head">
            <button type="button" class="tile-expand" data-action="expand-tile"
              aria-label="${esc(displayName)} bearbeiten" aria-expanded="${this._openTile===i?'true':'false'}"
              aria-controls="tile-details-${i}">
              <span class="tile-symbol" style="--tile-accent:${color}"><ha-icon icon="${esc(mdiIcon(tile.icon,tile.kind))}"></ha-icon></span>
              <span class="tile-text"><strong>${esc(displayName)}</strong>
                <small>${enabled?esc(sourceDetail):'Ausgeblendet'}</small></span>
              <span class="expand-action"><span>${this._openTile===i?'Schließen':'Bearbeiten'}</span>
                <span class="expand-arrow" aria-hidden="true">${this._openTile===i?'▴':'▾'}</span></span>
            </button>
            <button type="button" class="quick-visibility ${enabled?'':'is-off'}"
              data-action="toggle-enabled" aria-pressed="${enabled?'true':'false'}"
              aria-label="${enabled?'Ausblenden':'Einblenden'}: ${esc(displayName)}"
              title="${enabled?'Kachel ausblenden':'Kachel einblenden'}">
              <ha-icon icon="${enabled?'mdi:eye':'mdi:eye-off'}"></ha-icon>
            </button>
          </div>
          <div class="edit-body" id="tile-details-${i}" data-i="${i}" ${this._openTile===i?'':'hidden'}>
            <section class="edit-section">
              <div class="section-heading"><strong>Allgemein</strong><small>Bezeichnung und Aussehen</small></div>
              <div class="fields">
                <label class="control">Kacheltyp<select data-field="kind">${Object.entries(KINDS).map(([v,d])=>option(v,d.label,tile.kind)).join('')}</select></label>
                <label class="control">Untertitel<input data-field="label" value="${esc(displayName)}" placeholder="${esc(k.label)}"></label>
                <div class="control wide"><span>Symbol</span>
                  <ha-selector class="icon-selector" data-field="icon"
                    label="Alle verfügbaren Symbole durchsuchen" value="${esc(mdiIcon(tile.icon,tile.kind))}"></ha-selector>
                  <ha-icon-picker class="icon-picker-fallback" data-field="icon"
                    label="Alle verfügbaren Symbole durchsuchen" value="${esc(mdiIcon(tile.icon,tile.kind))}"></ha-icon-picker>
                  <div class="input-with-preview">
                    <input data-field="icon" value="${esc(mdiIcon(tile.icon,tile.kind))}"
                      aria-label="Icon-Name manuell eingeben" placeholder="mdi:home" spellcheck="false">
                    <ha-icon icon="${esc(mdiIcon(tile.icon,tile.kind))}" class="icon-preview"></ha-icon>
                  </div>
                  <p class="icon-help">Die Suche bietet alle in Home Assistant verfügbaren MDI-Symbole und installierte Icon-Sammlungen. Alternativ einen vollständigen Namen eingeben, z. B. mdi:shield-check.</p>
                </div>
                <label class="control wide">Aktive Farbe<select data-field="tone">${['alarm','lock'].includes(tile.kind)?option('auto','Automatisch nach Zustand',tile.tone||'auto'):''}${Object.entries(COLOR_LABELS).map(([v,d])=>option(v,d,tile.tone||k.tone)).join('')}</select></label>
              </div>
            </section>
            <section class="edit-section">
              <div class="section-heading"><strong>Datenquelle</strong><small>Welche Geräte werden berücksichtigt?</small></div>
              <div class="fields">
                <label class="control wide">Auswahlmethode<select data-field="source">${Object.entries(sourceLabels).map(([v,d])=>option(v,d,mode)).join('')}</select></label>
                ${mode==='auto'?`<label class="control">Bereich<select data-field="area">${option('','Alle Bereiche',tile.area||'')}${areas.map(a=>option(a.area_id||a.id,a.name,tile.area||'')).join('')}</select></label>
                  <label class="control">Entitäts-Präfix (optional)<input data-field="prefix" value="${esc(tile.prefix||'')}" placeholder="z. B. light."></label>`:''}
                ${(isGroup||(mode==='auto' && ['alarm','lock'].includes(tile.kind)))?`<div class="control wide"><span>${isGroup?'Gruppe / Helfer':'Einzelne Entität (optional)'}</span>
                  <ha-entity-picker data-field="entity" allow-custom-entity value="${esc(tile.entity||'')}"></ha-entity-picker>
                  <input data-field="entity" value="${esc(tile.entity||'')}" aria-label="Entitäts-ID manuell"
                    placeholder="Alternativ Entitäts-ID eingeben" spellcheck="false"></div>`:''}
                ${selectedFields}
              </div>
              ${mode==='auto'?'<p class="hint">Passende Entitäten werden automatisch über Home Assistant erkannt. Über Bereich und Präfix kannst du die Auswahl eingrenzen.</p>':''}
            </section>
            <section class="edit-section">
              <div class="section-heading"><strong>Navigation & Optionen</strong><small>Was passiert beim Antippen?</small></div>
              <div class="fields"><label class="control wide">Navigationsziel (optional)
                <input data-field="navigation_path" value="${esc(tile.navigation_path||'')}" placeholder="#details oder /dashboard/ansicht"></label>
                ${advancedFields.join('')}
              </div>
            </section>
            <div class="edit-actions">
              <button type="button" data-action="up" title="Nach oben" ${i===0?'disabled':''}>↑ Hoch</button>
              <button type="button" data-action="down" title="Nach unten" ${i===cfg.tiles.length-1?'disabled':''}>↓ Runter</button>
              <button type="button" data-action="duplicate" title="Kachel duplizieren">Duplizieren</button>
              <button type="button" data-action="reset-tile" title="Kachel auf Standardwerte zurücksetzen">Zurücksetzen</button>
              <span class="spacer"></span>
              <button type="button" class="remove" data-action="delete">Entfernen</button>
            </div>
          </div>
        </div>`;
      };
      const visible=cfg.tiles.filter(t=>t.enabled!==false).length;
      this.shadowRoot.innerHTML=`<style>${EDIT_CSS}</style><div class="editor">
        <header class="intro">
          <div class="brand-icon"><ha-icon icon="mdi:view-dashboard-outline"></ha-icon></div>
          <div class="intro-copy"><h3>MYHS Central Card</h3><p>Deine zentrale Smart-Home-Übersicht</p></div>
          <span class="version">Version 1.0.5</span>
        </header>
        <details class="settings" ${this._settingsOpen?'open':''}>
          <summary><span class="settings-icon"><ha-icon icon="mdi:tune-variant"></ha-icon></span>
            <span class="settings-summary"><strong>Darstellung</strong>
            <small>${esc(cfg.columns||2)} Spalten · ${esc(cfg.gap??8)} px Abstand</small></span><span class="chevron" aria-hidden="true">›</span></summary>
          <div class="settings-body">
            <div class="fields"><label class="control">Spalten<select data-global="columns">${[1,2,3,4].map(v=>option(v,v,cfg.columns||2)).join('')}</select></label>
              <label class="control">Kachelabstand (px)<input type="number" min="0" max="40" data-global="gap" value="${esc(cfg.gap??8)}"></label>
              <label class="check wide"><input type="checkbox" data-global="show_labels" ${cfg.show_labels!==false?'checked':''}>Untertitel anzeigen</label>
            </div>
            <details class="advanced" ${this._advancedOpen?'open':''}><summary>Erweiterte Einstellungen</summary>
              <label class="check"><input type="checkbox" data-global="alarm_home_legacy" ${cfg.alarm_home_legacy?'checked':''}>Alte Alarmanzeige für „armed_home“ verwenden</label>
              <p class="check-subtext">Nur für bestehende Sonderkonfigurationen. Home Assistant interpretiert diesen Zustand normalerweise als scharf geschaltet.</p>
            </details>
          </div>
        </details>
        <div class="tiles-title"><div><h3>Kacheln</h3><p>Bearbeiten oder über das Auge ein- und ausblenden.</p></div>
          <span class="count-badge">${visible} / ${cfg.tiles.length} sichtbar</span></div>
        <div class="editor-tools"><input type="search" id="tile-search" aria-label="Kacheln suchen" placeholder="Kachel suchen …">
          <div class="history-actions">
            <button type="button" id="undo" ${this._undoStack.length?'':'disabled'} title="Letzte Änderung zurücknehmen">↶ Rückgängig</button>
            <button type="button" id="redo" ${this._redoStack.length?'':'disabled'} title="Änderung wiederholen">↷ Wiederholen</button>
          </div>
        </div>
        <div class="tile-list">${cfg.tiles.map(editorTile).join('')}
          <div id="empty-filter" class="no-results" hidden>Keine passenden Kacheln gefunden.</div></div>
        <div class="add-panel"><strong>Neue Kachel hinzufügen</strong>
          <div class="add-controls"><select id="new-kind" aria-label="Neuen Kacheltyp wählen">${Object.entries(KINDS).map(([v,d])=>option(v,d.label,'')).join('')}</select>
            <button type="button" class="primary" id="add-tile">+ Hinzufügen</button></div></div>
        <p class="footer-note" id="filter-count"></p>
        <p class="footer-note">Tipp: Für Wecker, Fahrzeuge und Raumluft eigene Entitäten auswählen. · Version 1.0.5</p>
      </div>`;
      const search=this.shadowRoot.querySelector('#tile-search');
      if(search)search.value=this._searchQuery;
      this._syncingPickers=true;
      for(const picker of this.shadowRoot.querySelectorAll('ha-selector[data-field="icon"], ha-icon-picker, ha-entity-picker')){
        if(this._hass && ['ha-entity-picker','ha-selector'].includes(picker.localName))picker.hass=this._hass;
        if(picker.localName==='ha-selector'){
          picker.selector={icon:{}};
          picker.required=false;
        }
        if(picker.dataset.field!=='new-entity')picker.value=picker.getAttribute('value')||'';
        // Some Home Assistant picker versions dispatch non-bubbling events.
        // Bind directly as well so the selection is never lost.
        picker.addEventListener('value-changed',e=>this._pickerChanged(e));
      }
      this._syncingPickers=false;
      this._applyFilter();
    }
  }
  customElements.define(TAG,CentralOverviewCard);
  customElements.define(EDITOR_TAG,CentralOverviewEditor);
  window.customCards=window.customCards||[];
  if (!window.customCards.some(c=>c.type===TAG)) {
    window.customCards.push({type:TAG,name:'MYHS Central Card',
      description:'16 frei konfigurierbare Status-Kacheln mit visuellem Editor und Home-Assistant-Icons.',preview:true});
  }
})();
