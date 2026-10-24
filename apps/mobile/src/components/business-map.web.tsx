import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { Brand } from '@/constants/theme';
import { categoryBySlug, initials, ZONE } from '@/data';

import type { BusinessMapProps } from './business-map-types';
import { LEAFLET_CSS } from './leaflet-css';

function ensureCss() {
  if (typeof document === 'undefined' || document.getElementById('leaflet-css')) return;
  const style = document.createElement('style');
  style.id = 'leaflet-css';
  style.textContent =
    LEAFLET_CSS +
    `.x-pin{display:flex;align-items:center;justify-content:center;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 8px rgba(18,26,43,.35);font:800 11px system-ui,sans-serif}
     .x-pin span{transform:rotate(45deg)}
     .x-me{width:18px;height:18px;border-radius:50%;background:#2F6FE0;border:3px solid #fff;box-shadow:0 0 0 6px rgba(47,111,224,.25)}
     .leaflet-container{font-family:system-ui,sans-serif;background:#E6EAF1}`;
  document.head.appendChild(style);
}

function pinIcon(color: string, ink: string, label: string, on: boolean) {
  const size = on ? 42 : 30;
  return L.divIcon({
    className: '',
    html: `<div class="x-pin" style="width:${size}px;height:${size}px;background:${color};color:${ink}"><span>${on ? label : ''}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

/** Mapa real en web (OpenStreetMap), con un pin por experto del color de su categoría. */
export function BusinessMap({ businesses, selected, onSelect, userLocation, still, focus }: BusinessMapProps) {
  const host = useRef<unknown>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    ensureCss();
    const el = host.current as unknown as HTMLElement | null;
    if (!el || map.current) return;
    const m = L.map(el, {
      zoomControl: false,
      dragging: !still,
      scrollWheelZoom: !still,
      doubleClickZoom: !still,
      touchZoom: !still,
      keyboard: !still,
      attributionControl: true,
    }).setView([ZONE.lat, ZONE.lng], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '© OpenStreetMap · © CARTO',
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    // El contenedor puede medir cero al montar: se recalcula cuando ya tiene tamaño
    setTimeout(() => m.invalidateSize(), 50);
    return () => {
      m.remove();
      map.current = null;
    };
  }, [still]);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    for (const b of businesses) {
      const cat = categoryBySlug(b.categorySlug);
      const color = cat?.color === Brand.line ? Brand.inkSoft : cat?.color ?? Brand.chile;
      const on = b.slug === selected;
      L.marker([b.lat, b.lng], { icon: pinIcon(color, cat?.ink === Brand.mango ? Brand.mango : Brand.white, initials(b.name).toUpperCase(), on), zIndexOffset: on ? 1000 : 0, title: b.name })
        .on('click', () => onSelectRef.current(b.slug))
        .addTo(g);
    }
    if (userLocation) L.marker([userLocation.lat, userLocation.lng], { icon: L.divIcon({ className: '', html: '<div class="x-me"></div>', iconSize: [18, 18] }) }).addTo(g);
    const sel = businesses.find((b) => b.slug === selected);
    if (focus && sel) m.setView([sel.lat, sel.lng], still ? 16 : m.getZoom(), { animate: !still });
    else if (!still && businesses.length > 1) m.fitBounds(L.latLngBounds(businesses.map((b) => [b.lat, b.lng] as [number, number])).pad(0.2), { maxZoom: 16 });
  }, [businesses, selected, userLocation, focus, still]);

  return <View ref={host as never} style={{ flex: 1, minHeight: 120 }} />;
}
