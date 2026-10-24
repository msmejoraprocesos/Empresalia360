-- Datos base: zonas y categorías iniciales (sin negocios de ejemplo)

insert into public.zones (name, municipality, state, slug) values
  ('Zen House', 'El Marqués', 'Querétaro', 'zen-house'),
  ('Residencial del Parque', 'El Marqués', 'Querétaro', 'residencial-del-parque'),
  ('El Mirador', 'El Marqués', 'Querétaro', 'el-mirador'),
  ('Cumbres de Conín', 'El Marqués', 'Querétaro', 'cumbres-de-conin')
on conflict (slug) do nothing;

insert into public.categories (name, slug, color, icon, position) values
  ('Comida', 'comida', '#E04A1F', 'comida', 1),
  ('Café y postres', 'cafe-y-postres', '#FFC93C', 'cafe', 2),
  ('Belleza', 'belleza', '#E8457C', 'belleza', 3),
  ('Salud', 'salud', '#2D7FF9', 'salud', 4),
  ('Profesionales', 'profesionales', '#7B4FE0', 'profesionales', 5),
  ('Autos y talleres', 'autos-y-talleres', '#1F1A17', 'autos', 6),
  ('Hogar y oficios', 'hogar-y-oficios', '#12A06E', 'hogar', 7),
  ('Tiendas', 'tiendas', '#6A5F57', 'tiendas', 8)
on conflict (slug) do nothing;
