/* =============================================================================
   map.js — Leaflet マップ描画 (APIキー不要・完全無料)
============================================================================= */

/* --- 定数 ---------------------------------------------------------------- */
// 中心座標・ズームレベル
const MAP_CENTER = [26.504, 127.934];
const DEFAULT_ZOOM = 9;

// エリアのフライ先定義
const FLY_LOCATIONS = {
  'fly-japan':    { center: [38.491, 136.336], zoom: 4 },
  'fly-okinawa':  { center: [25.246, 125.484], zoom: 7 },
  'fly-mainland': { center: MAP_CENTER,    zoom: DEFAULT_ZOOM },
};

/* --- マップ初期化 --------------------------------------------------------- */
const map = L.map('map', {
  center: MAP_CENTER,
  zoom: DEFAULT_ZOOM,
  maxZoom: 18,
  zoomControl: true,
});

// ベースタイル（Esri World Imagery — 衛星画像・無料・APIキー不要）
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, USGS, NOAA',
  maxZoom: 19,
}).addTo(map);

/*
  OpenStreetMap にしたい場合:
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);
*/

/* --------------------------------------------------------
  　スピナー制御
  -------------------------------------------------------- */
const spinner = document.getElementById('loading');

function showSpinner() { spinner.style.visibility = 'visible'; }
function hideSpinner() { spinner.style.visibility = 'hidden'; }


/* --------------------------------------------------------
  　GeoJSON レイヤー管理
  -------------------------------------------------------- */
// レイヤーを格納するオブジェクト (id → Leaflet layer)
const layers = {};

/**
 単色（ポイント、ライン、ポリゴン）
 */
async function SingleColor(id, url, options, popupProps = '名前') {
  showSpinner();
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GeoJSONの取得に失敗しました: ${url}`);
    const data = await res.json();

    layers[id] = L.geoJSON(data, {
      pointToLayer: (feature, latlng) => L.circleMarker(latlng, options),
      style: options,
      onEachFeature: (feature, layer) => {
        const props = Array.isArray(popupProps) ? popupProps : [popupProps];
        const html = props
          .map(p => feature.properties?.[p] ?? '')
          .filter(Boolean)
          .join('<br>');
        if (html) {
          layer.bindPopup(html);
          layer.on('mouseover', () => layer.openPopup());
          layer.on('mouseout',  () => layer.closePopup());
        }
      },
    });
    // チェックボックスの初期状態に応じて表示
    const checkbox = document.getElementById(`${id}Checkbox`);
    if (checkbox?.checked) layers[id].addTo(map);

  } catch (err) {
    console.error(err);
  } finally {
    hideSpinner();
  }
}


/**
 複数色（ポイント）
 */
async function ColoredPoint(id, url, colorProp, colorMap, defaultColor, baseOptions, popupProps) {
  showSpinner();
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GeoJSONの取得に失敗しました: ${url}`);
    const data = await res.json();

    layers[id] = L.geoJSON(data, {
      pointToLayer: (feature, latlng) => {
        const val = feature.properties?.[colorProp];
        const fillColor = colorMap[val] ?? defaultColor;
        return L.circleMarker(latlng, { ...baseOptions, fillColor, color: fillColor });
      },
      onEachFeature: (feature, layer) => {
        const props = Array.isArray(popupProps) ? popupProps : [popupProps];
        const html = props
          .map(p => feature.properties?.[p] ?? '')
          .filter(Boolean)
          .join('<br>');
        if (html) {
          layer.bindPopup(html);
          layer.on('mouseover', () => layer.openPopup());
          layer.on('mouseout',  () => layer.closePopup());
        }
      },
    });

    const checkbox = document.getElementById(`${id}Checkbox`);
    if (checkbox?.checked) layers[id].addTo(map);

  } catch (err) {
    console.error(err);
  } finally {
    hideSpinner();
  }
}

/**
 複数色（ライン）
 */
async function ColoredLine(id, url, colorProp, colorMap, defaultColor, baseOptions, popupProps) {
  showSpinner();
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GeoJSONの取得に失敗しました: ${url}`);
    const data = await res.json();

    layers[id] = L.geoJSON(data, {
      style: (feature) => {
        const val = feature.properties?.[colorProp];
        const color = colorMap[val] ?? defaultColor;
        return { ...baseOptions, color };
      },
      onEachFeature: (feature, layer) => {
        const props = Array.isArray(popupProps) ? popupProps : [popupProps];
        const html = props
          .map(p => feature.properties?.[p] ?? '')
          .filter(Boolean)
          .join('<br>');
        if (html) {
          layer.bindPopup(html);
          layer.on('mouseover', () => layer.openPopup());
          layer.on('mouseout',  () => layer.closePopup());
        }
      },
    });

    const checkbox = document.getElementById(`${id}Checkbox`);
    if (checkbox?.checked) layers[id].addTo(map);

  } catch (err) {
    console.error(err);
  } finally {
    hideSpinner();
  }
}

/**
 複数色（ポリゴン）
 */
async function ColoredPolygon(id, urls, colorProp, colorMap, defaultColor, fillOpacity, popupProps) {
  showSpinner();
  try {
    const results = await Promise.all(
      urls.map(url => fetch(url).then(r => {
        if (!r.ok) throw new Error(`GeoJSONの取得に失敗しました: ${url}`);
        return r.json();
      }))
    );

    // 全ファイルのフィーチャーを1つにまとめる
    const merged = {
      type: 'FeatureCollection',
      features: results.flatMap(d => d.features ?? []),
    };

    layers[id] = L.geoJSON(merged, {
      style: (feature) => {
        const val = feature.properties?.[colorProp];
        const fillColor = colorMap[val] ?? defaultColor;
        return { fillColor, color: '#ffffff', weight: 0.5, opacity: 0.8, fillOpacity };
      },
      onEachFeature: (feature, layer) => {
        const props = Array.isArray(popupProps) ? popupProps : [popupProps];
        const html = props
          .map(p => feature.properties?.[p] ?? '')
          .filter(Boolean)
          .join('<br>');
        if (html) {
          layer.bindPopup(html);
          layer.on('mouseover', () => layer.openPopup());
          layer.on('mouseout',  () => layer.closePopup());
        }
      },
    });

    const checkbox = document.getElementById(`${id}Checkbox`);
    if (checkbox?.checked) layers[id].addTo(map);

  } catch (err) {
    console.error(err);
  } finally {
    hideSpinner();
  }
}

/* --------------------------------------------------------
  　レイヤーの表示/非表示を切り替える
  -------------------------------------------------------- */
/**
 * レイヤーの表示/非表示を切り替える
 * @param {string}  id      - レイヤーID
 * @param {boolean} visible - true: 表示 / false: 非表示
 */
function setLayerVisibility(id, visible) {
  if (!layers[id]) return;
  if (visible) {
    map.addLayer(layers[id]);
  } else {
    map.removeLayer(layers[id]);
  }
}

/* --------------------------------------------------------
  　単色レイヤー
  -------------------------------------------------------- */
/* --- レストラン（ポイント) -------------------------------------------------- */
SingleColor('restaurants', './geojson/restaurants/restaurants.geojson', {
  radius: 5,
  fillColor: 'yellow',
  color: 'blue',
  weight: 1,
  opacity: 1,
  fillOpacity: 0.9,
});

/* --- 鉄道（ライン） --- */
SingleColor('railways', './geojson/railways/railways.geojson', {
  color: 'red',
  weight: 3,
  opacity: 0.8,
}, 'N02_004');

/* --- 在日米軍（ポリゴン） --- */
SingleColor('usa_military', './geojson/usa_military/usa_military.geojson', {
  color: 'pink',       // アウトライン色
  weight: 2,
  opacity: 1.0,        // アウトラインの透明度
  fillColor: 'pink',   // 塗りつぶし色
  fillOpacity: 0.5,    // 塗りつぶしの透明度（0〜1）
}, 'FACNAME');

/* --------------------------------------------------------
  　複数色レイヤー
  -------------------------------------------------------- */
  /* --- 宿泊施設（ポイント） --- */
  ColoredPoint(
  'hotels',
  './geojson/hotels/hotels.geojson',
  'タイプ',
  {
    '民宿':         'red',
    'ホテル':       'lime',
    'コンドミニアム': 'blue',
    'ロッジ':       'yellow',
    '旅館':         'purple',
    '貸別荘':       'cyan',
    'ペンション':   'orange',
    'トレーラハウス': 'pink',
    'ユースホステル': 'brown',
  },
  '#000000',
  { radius: 4, weight: 1, opacity: 1, fillOpacity: 0.9 },
  ['タイプ', '名前'],
);

/* --- 空港ネットワーク レイヤー（出発空港別色分け） ------------------------ */
ColoredLine(
  'flight_network',
  './geojson/flight_network/flight_network.geojson',
  'S10b_004',
  {
    '那覇':   '#ff0000',
    '久米島': '#00ff00',
    '石垣':   '#0000ff',
    '宮古':   '#f00000',
    '多良間': '#0f0000',
    '与那国': '#00aaff',
    '下地島': '#aa00ff',
    '北大東': '#ff6600',
    '慶良間': '#00ffaa',
    '粟国':   '#ffaa00',
    '南大東': '#ff00aa',
    '波照間': '#aaff00',
  },
  '#ffff00',
  { weight: 0.5, opacity: 1 },
  'C28_005',
);

/* --- 用途地域 レイヤー（市区町村別・色分け） ------------------------------ */

const YOUTO_CHIIKI_COLOR_MAP = {
  '第一種低層住居専用地域':   '#6ab547',
  '第二種低層住居専用地域':   '#6ab547',
  '第一種中高層住居専用地域': '#6ab547',
  '第二種中高層住居専用地域': '#6ab547',
  '第二種住居地域':           '#6ab547',
  '田園住居地域':             '#6ab547',
  '準住居地域':               '#6ab547',
  '近隣商業地域':             '#da81b2',
  '商業地域':                 '#da81b2',
  '準工業地域':               '#4c6cb3',
  '工業地域':                 '#4c6cb3',
  '工業専用地域':             '#4c6cb3',
};

const YOUTO_CHIIKI_URLS = [
  'A29-19_47205', 'A29-19_47208', 'A29-19_47209', 'A29-19_47210',
  'A29-19_47211', 'A29-19_47212', 'A29-19_47213', 'A29-19_47214',
  'A29-19_47215', 'A29-19_47324', 'A29-19_47325', 'A29-19_47326',
  'A29-19_47327', 'A29-19_47328', 'A29-19_47329', 'A29-19_47348',
  'A29-19_47350', 'A29-19_47362',
].map(name => `./geojson/youto_chiiki/${name}.geojson`);

ColoredPolygon(
  'youto_chiiki',
  YOUTO_CHIIKI_URLS,
  'A29_005',
  YOUTO_CHIIKI_COLOR_MAP,
  '#000000',
  0.9,
  'A29_005',
);


/* --------------------------------------------------------
  　チェックボックス イベント
  -------------------------------------------------------- */
document.getElementById('restaurantsCheckbox')
  .addEventListener('change', function () {
    setLayerVisibility('restaurants', this.checked);
  });
document.getElementById('railwaysCheckbox')
  .addEventListener('change', function () {
    setLayerVisibility('railways', this.checked);
  });
document.getElementById('usa_militaryCheckbox')
  .addEventListener('change', function () {
    setLayerVisibility('usa_military', this.checked);
  });
document.getElementById('hotelsCheckbox')
  .addEventListener('change', function () {
    setLayerVisibility('hotels', this.checked);
  });
document.getElementById('flight_networkCheckbox')
  .addEventListener('change', function () {
    setLayerVisibility('flight_network', this.checked);
  });
document.getElementById('youto_chiikiCheckbox')
  .addEventListener('change', function () {
    setLayerVisibility('youto_chiiki', this.checked);
  });


/* --------------------------------------------------------
  　エリア選択（フライ機能）
  -------------------------------------------------------- */
document.getElementById('area').addEventListener('change', function () {
  const loc = FLY_LOCATIONS[this.value];
  if (!loc) return;
  map.flyTo(loc.center, loc.zoom, { duration: 1.5 });
});
