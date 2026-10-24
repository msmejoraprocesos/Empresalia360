-- Negocios de ejemplo (ficticios) para probar la app. Generado por apps/mobile/scripts/generate-demo-seed.ts
-- Para borrarlos: delete from public.businesses where slug in (...);

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Café La Esquina', 'cafe-la-esquina', 'Cafetería · waffles', 'Café de especialidad y waffles belgas hechos al momento. Pet friendly.',
  (select id from public.categories where slug = 'cafe-y-postres'),
  (select id from public.zones where slug = 'zen-house'),
  '5214420000101', '5214420000101', 'Av. Zen 120, local 4',
  extensions.st_setsrid(extensions.st_makepoint(-100.3301, 20.6022), 4326)::extensions.geography,
  true, true, true, 'plata', 'activo', true, '2x1 en waffles de 4 a 6 pm'
where not exists (select 1 from public.businesses where slug = 'cafe-la-esquina');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'cafe-la-esquina'), 'ordenar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'cafe-la-esquina'), 0, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'cafe-la-esquina'), 1, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'cafe-la-esquina'), 2, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'cafe-la-esquina'), 3, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'cafe-la-esquina'), 4, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'cafe-la-esquina'), 5, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'cafe-la-esquina'), 6, '09:00', '21:00') on conflict do nothing;
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'cafe-la-esquina'), 'producto', 'Americano grande', '16 oz, grano de Veracruz', 'Café', 45, null, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'cafe-la-esquina') and name = 'Americano grande');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'cafe-la-esquina'), 'producto', 'Latte', 'Leche entera o de avena', 'Café', 58, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'cafe-la-esquina') and name = 'Latte');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'cafe-la-esquina'), 'producto', 'Waffle de fresa', 'Fresas, crema y miel', 'Waffles', 95, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'cafe-la-esquina') and name = 'Waffle de fresa');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'cafe-la-esquina'), 'producto', 'Waffle Nutella', 'Nutella y plátano', 'Waffles', 105, null, true, 3 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'cafe-la-esquina') and name = 'Waffle Nutella');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'cafe-la-esquina'), 'producto', 'Limonada natural', '500 ml', 'Bebidas', 40, null, true, 4 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'cafe-la-esquina') and name = 'Limonada natural');
insert into public.loyalty_programs (business_id, kind, goal, percent, reward) select (select id from public.businesses where slug = 'cafe-la-esquina'), 'sellos', 10, null, 'Café americano gratis' where not exists (select 1 from public.loyalty_programs where business_id = (select id from public.businesses where slug = 'cafe-la-esquina'));
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'cafe-la-esquina'), 'Rodrigo M.', 5, 'El waffle de fresa es otro nivel y ya voy en mi sello 6.', '¡Gracias, Rodrigo! Te esperamos por el séptimo.' where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'cafe-la-esquina') and author_name = 'Rodrigo M.' and body = 'El waffle de fresa es otro nivel y ya voy en mi sello 6.');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'cafe-la-esquina'), 'Lucía P.', 5, 'Lugar acogedor, buen café y precios justos.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'cafe-la-esquina') and author_name = 'Lucía P.' and body = 'Lugar acogedor, buen café y precios justos.');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'cafe-la-esquina'), 'Javier R.', 4, 'Ricos waffles, en fin de semana tardan un poco.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'cafe-la-esquina') and author_name = 'Javier R.' and body = 'Ricos waffles, en fin de semana tardan un poco.');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Fonda Doña Lupe', 'fonda-dona-lupe', 'Comida casera', 'Comida corrida, guisos y antojitos. Menú del día de lunes a sábado.',
  (select id from public.categories where slug = 'comida'),
  (select id from public.zones where slug = 'residencial-del-parque'),
  '5214420000102', '5214420000102', 'Calle Bambú 33',
  extensions.st_setsrid(extensions.st_makepoint(-100.3272, 20.5998), 4326)::extensions.geography,
  true, true, true, 'plata', 'activo', true, 'Postre gratis en pedidos desde $250'
where not exists (select 1 from public.businesses where slug = 'fonda-dona-lupe');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'fonda-dona-lupe'), 'ordenar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'fonda-dona-lupe'), 0, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'fonda-dona-lupe'), 1, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'fonda-dona-lupe'), 2, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'fonda-dona-lupe'), 3, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'fonda-dona-lupe'), 4, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'fonda-dona-lupe'), 5, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'fonda-dona-lupe'), 6, '09:00', '18:00') on conflict do nothing;
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'fonda-dona-lupe'), 'producto', 'Comida corrida', 'Sopa, guisado, arroz, frijoles y agua', 'Menú del día', 110, null, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'fonda-dona-lupe') and name = 'Comida corrida');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'fonda-dona-lupe'), 'producto', 'Enchiladas suizas', 'Pollo, salsa verde cremosa', 'Guisos', 135, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'fonda-dona-lupe') and name = 'Enchiladas suizas');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'fonda-dona-lupe'), 'producto', 'Chiles rellenos', 'De queso, con arroz', 'Guisos', 125, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'fonda-dona-lupe') and name = 'Chiles rellenos');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'fonda-dona-lupe'), 'producto', 'Orden de sopes', '3 piezas', 'Antojitos', 75, null, true, 3 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'fonda-dona-lupe') and name = 'Orden de sopes');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'fonda-dona-lupe'), 'producto', 'Agua de jamaica', '1 litro', 'Bebidas', 35, null, true, 4 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'fonda-dona-lupe') and name = 'Agua de jamaica');
insert into public.loyalty_programs (business_id, kind, goal, percent, reward) select (select id from public.businesses where slug = 'fonda-dona-lupe'), 'sellos', 8, null, 'Comida corrida gratis' where not exists (select 1 from public.loyalty_programs where business_id = (select id from public.businesses where slug = 'fonda-dona-lupe'));
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'fonda-dona-lupe'), 'Ana G.', 5, 'Sabe como en casa, y el pedido llegó caliente.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'fonda-dona-lupe') and author_name = 'Ana G.' and body = 'Sabe como en casa, y el pedido llegó caliente.');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'fonda-dona-lupe'), 'Pedro S.', 4, 'Muy rico, porciones grandes.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'fonda-dona-lupe') and author_name = 'Pedro S.' and body = 'Muy rico, porciones grandes.');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Taquería El Güero', 'taqueria-el-guero', 'Tacos · por la noche', 'Tacos al pastor, suadero y campechanos. Abierto de 7 pm a 1 am.',
  (select id from public.categories where slug = 'comida'),
  (select id from public.zones where slug = 'zen-house'),
  '5214420000103', '5214420000103', 'Av. Constituyentes 812',
  extensions.st_setsrid(extensions.st_makepoint(-100.3265, 20.6041), 4326)::extensions.geography,
  false, true, false, 'plata', 'activo', true, null
where not exists (select 1 from public.businesses where slug = 'taqueria-el-guero');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'taqueria-el-guero'), 'ordenar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taqueria-el-guero'), 0, '09:00', '01:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taqueria-el-guero'), 1, '09:00', '01:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taqueria-el-guero'), 2, '09:00', '01:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taqueria-el-guero'), 3, '09:00', '01:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taqueria-el-guero'), 4, '09:00', '01:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taqueria-el-guero'), 5, '09:00', '01:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taqueria-el-guero'), 6, '09:00', '01:00') on conflict do nothing;
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'taqueria-el-guero'), 'producto', 'Taco al pastor', null, 'Tacos', 18, null, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'taqueria-el-guero') and name = 'Taco al pastor');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'taqueria-el-guero'), 'producto', 'Taco de suadero', null, 'Tacos', 18, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'taqueria-el-guero') and name = 'Taco de suadero');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'taqueria-el-guero'), 'producto', 'Gringa', null, 'Tacos', 55, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'taqueria-el-guero') and name = 'Gringa');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'taqueria-el-guero'), 'Luis T.', 5, 'El mejor pastor de la zona.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'taqueria-el-guero') and author_name = 'Luis T.' and body = 'El mejor pastor de la zona.');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Barbería El Bigote', 'barberia-el-bigote', 'Barbería', 'Cortes clásicos y modernos, barba con toalla caliente.',
  (select id from public.categories where slug = 'belleza'),
  (select id from public.zones where slug = 'residencial-del-parque'),
  '5214420000104', '5214420000104', 'Plaza Zen, local 12',
  extensions.st_setsrid(extensions.st_makepoint(-100.3318, 20.6008), 4326)::extensions.geography,
  true, true, false, 'plata', 'activo', true, '10% de descuento al reservar por Expertalia 360'
where not exists (select 1 from public.businesses where slug = 'barberia-el-bigote');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'barberia-el-bigote'), 'reservar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'barberia-el-bigote'), 0, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'barberia-el-bigote'), 1, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'barberia-el-bigote'), 2, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'barberia-el-bigote'), 3, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'barberia-el-bigote'), 4, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'barberia-el-bigote'), 5, '09:00', '21:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'barberia-el-bigote'), 6, '09:00', '21:00') on conflict do nothing;
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'barberia-el-bigote'), 'Luis' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'barberia-el-bigote') and name = 'Luis');
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'barberia-el-bigote'), 'Toño' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'barberia-el-bigote') and name = 'Toño');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'barberia-el-bigote'), 'cita', 'Corte clásico', null, null, 180, 40, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'barberia-el-bigote') and name = 'Corte clásico');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'barberia-el-bigote'), 'cita', 'Corte y barba', null, null, 260, 60, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'barberia-el-bigote') and name = 'Corte y barba');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'barberia-el-bigote'), 'cita', 'Corte infantil', null, null, 150, 30, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'barberia-el-bigote') and name = 'Corte infantil');
insert into public.loyalty_programs (business_id, kind, goal, percent, reward) select (select id from public.businesses where slug = 'barberia-el-bigote'), 'sellos', 6, null, '50% en tu sexto corte' where not exists (select 1 from public.loyalty_programs where business_id = (select id from public.businesses where slug = 'barberia-el-bigote'));
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'barberia-el-bigote'), 'Rodrigo M.', 5, 'Llegué a la hora y me atendieron de inmediato.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'barberia-el-bigote') and author_name = 'Rodrigo M.' and body = 'Llegué a la hora y me atendieron de inmediato.');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Estética Bella Luna', 'estetica-bella-luna', 'Salón de belleza', 'Corte, color, uñas y pestañas. Productos profesionales.',
  (select id from public.categories where slug = 'belleza'),
  (select id from public.zones where slug = 'el-mirador'),
  '5214420000105', '5214420000105', 'Calle Loto 18',
  extensions.st_setsrid(extensions.st_makepoint(-100.3335, 20.5985), 4326)::extensions.geography,
  true, true, false, 'plata', 'activo', true, '30% en tu primera visita'
where not exists (select 1 from public.businesses where slug = 'estetica-bella-luna');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'estetica-bella-luna'), 'reservar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'estetica-bella-luna'), 0, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'estetica-bella-luna'), 1, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'estetica-bella-luna'), 2, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'estetica-bella-luna'), 3, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'estetica-bella-luna'), 4, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'estetica-bella-luna'), 5, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'estetica-bella-luna'), 6, '09:00', '20:00') on conflict do nothing;
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'estetica-bella-luna'), 'Karla' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'estetica-bella-luna') and name = 'Karla');
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'estetica-bella-luna'), 'Mónica' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'estetica-bella-luna') and name = 'Mónica');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'estetica-bella-luna'), 'cita', 'Corte de dama', null, null, 250, 45, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'estetica-bella-luna') and name = 'Corte de dama');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'estetica-bella-luna'), 'cita', 'Tinte completo', null, null, 650, 120, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'estetica-bella-luna') and name = 'Tinte completo');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'estetica-bella-luna'), 'cita', 'Uñas en gel', null, null, 320, 60, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'estetica-bella-luna') and name = 'Uñas en gel');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'estetica-bella-luna'), 'Claudia R.', 5, 'Me encantó el color, muy profesionales.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'estetica-bella-luna') and author_name = 'Claudia R.' and body = 'Me encantó el color, muy profesionales.');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Dental Sonríe', 'dental-sonrie', 'Consultorio dental', 'Limpieza, resinas, ortodoncia y urgencias dentales.',
  (select id from public.categories where slug = 'salud'),
  (select id from public.zones where slug = 'residencial-del-parque'),
  '5214420000106', '5214420000106', 'Blvd. Zen 450, consultorio 3',
  extensions.st_setsrid(extensions.st_makepoint(-100.3342, 20.6031), 4326)::extensions.geography,
  true, true, false, 'plata', 'activo', true, '2x1 en limpieza dental'
where not exists (select 1 from public.businesses where slug = 'dental-sonrie');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'dental-sonrie'), 'reservar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'dental-sonrie'), 0, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'dental-sonrie'), 1, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'dental-sonrie'), 2, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'dental-sonrie'), 3, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'dental-sonrie'), 4, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'dental-sonrie'), 5, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'dental-sonrie'), 6, '09:00', '19:00') on conflict do nothing;
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'dental-sonrie'), 'Dra. Pérez' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'dental-sonrie') and name = 'Dra. Pérez');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'dental-sonrie'), 'cita', 'Limpieza dental', null, null, 450, 40, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'dental-sonrie') and name = 'Limpieza dental');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'dental-sonrie'), 'cita', 'Valoración', null, null, 200, 20, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'dental-sonrie') and name = 'Valoración');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'dental-sonrie'), 'cotizacion', 'Ortodoncia', 'Precio según valoración', null, null, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'dental-sonrie') and name = 'Ortodoncia');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'dental-sonrie'), 'Marta L.', 5, 'Sin dolor y muy bien explicado.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'dental-sonrie') and author_name = 'Marta L.' and body = 'Sin dolor y muy bien explicado.');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Lic. Mariana Ortiz', 'lic-mariana-ortiz', 'Abogada · derecho familiar', 'Divorcios, pensiones, custodia y testamentos. 12 años de experiencia. Cédula verificada.',
  (select id from public.categories where slug = 'profesionales'),
  (select id from public.zones where slug = 'zen-house'),
  '5214420000107', '5214420000107', 'Plaza Zen, local 8',
  extensions.st_setsrid(extensions.st_makepoint(-100.3254, 20.6012), 4326)::extensions.geography,
  true, true, false, 'plata', 'activo', true, null
where not exists (select 1 from public.businesses where slug = 'lic-mariana-ortiz');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 'reservar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 'cotizar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 'consulta') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 0, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 1, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 2, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 3, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 4, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 5, '09:00', '18:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'lic-mariana-ortiz'), 6, '09:00', '18:00') on conflict do nothing;
insert into public.staff (business_id, name) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'Lic. Ortiz' where not exists (select 1 from public.staff where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and name = 'Lic. Ortiz');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'cita', 'Consulta inicial', 'En despacho o videollamada', null, 500, 30, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and name = 'Consulta inicial');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'cotizacion', 'Divorcio voluntario', 'Precio según el caso', null, null, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and name = 'Divorcio voluntario');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'cotizacion', 'Pensión alimenticia', 'Precio según el caso', null, null, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and name = 'Pensión alimenticia');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'lic-mariana-ortiz'), 'Claudia R.', 5, 'Me explicó todo con claridad y la cotización llegó el mismo día.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'lic-mariana-ortiz') and author_name = 'Claudia R.' and body = 'Me explicó todo con claridad y la cotización llegó el mismo día.');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Taller Mecánico López', 'taller-mecanico-lopez', 'Mecánica general', 'Frenos, afinación, suspensión y diagnóstico por computadora.',
  (select id from public.categories where slug = 'autos-y-talleres'),
  (select id from public.zones where slug = 'cumbres-de-conin'),
  '5214420000108', '5214420000108', 'Av. Industrial 77',
  extensions.st_setsrid(extensions.st_makepoint(-100.3312, 20.6058), 4326)::extensions.geography,
  true, true, false, 'plata', 'activo', true, null
where not exists (select 1 from public.businesses where slug = 'taller-mecanico-lopez');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'taller-mecanico-lopez'), 'reservar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'taller-mecanico-lopez'), 'cotizar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taller-mecanico-lopez'), 0, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taller-mecanico-lopez'), 1, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taller-mecanico-lopez'), 2, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taller-mecanico-lopez'), 3, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taller-mecanico-lopez'), 4, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taller-mecanico-lopez'), 5, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'taller-mecanico-lopez'), 6, '09:00', '19:00') on conflict do nothing;
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'taller-mecanico-lopez'), 'cita', 'Diagnóstico', null, null, 350, 60, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'taller-mecanico-lopez') and name = 'Diagnóstico');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'taller-mecanico-lopez'), 'cita', 'Afinación', null, null, 1200, 180, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'taller-mecanico-lopez') and name = 'Afinación');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'taller-mecanico-lopez'), 'cotizacion', 'Cambio de balatas', 'Según modelo del auto', null, null, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'taller-mecanico-lopez') and name = 'Cambio de balatas');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'taller-mecanico-lopez'), 'Jorge V.', 5, 'Honestos, me mandaron fotos de las piezas.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'taller-mecanico-lopez') and author_name = 'Jorge V.' and body = 'Honestos, me mandaron fotos de las piezas.');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Refaccionaria Ruiz', 'refaccionaria-ruiz', 'Refacciones', 'Refacciones para todas las marcas. Precio especial a talleres.',
  (select id from public.categories where slug = 'autos-y-talleres'),
  (select id from public.zones where slug = 'cumbres-de-conin'),
  '5214420000109', '5214420000109', 'Av. Industrial 102',
  extensions.st_setsrid(extensions.st_makepoint(-100.3289, 20.6066), 4326)::extensions.geography,
  true, true, true, 'plata', 'activo', true, null
where not exists (select 1 from public.businesses where slug = 'refaccionaria-ruiz');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'refaccionaria-ruiz'), 'ordenar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'refaccionaria-ruiz'), 'cotizar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'refaccionaria-ruiz'), 0, '09:00', '19:30') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'refaccionaria-ruiz'), 1, '09:00', '19:30') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'refaccionaria-ruiz'), 2, '09:00', '19:30') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'refaccionaria-ruiz'), 3, '09:00', '19:30') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'refaccionaria-ruiz'), 4, '09:00', '19:30') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'refaccionaria-ruiz'), 5, '09:00', '19:30') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'refaccionaria-ruiz'), 6, '09:00', '19:30') on conflict do nothing;
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'refaccionaria-ruiz'), 'producto', 'Balatas delanteras', 'Varias marcas', 'Frenos', 590, null, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'refaccionaria-ruiz') and name = 'Balatas delanteras');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'refaccionaria-ruiz'), 'producto', 'Bujías (juego de 4)', null, 'Afinación', 420, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'refaccionaria-ruiz') and name = 'Bujías (juego de 4)');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'refaccionaria-ruiz'), 'cotizacion', 'Otra pieza', 'Dinos marca, modelo y año', null, null, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'refaccionaria-ruiz') and name = 'Otra pieza');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'refaccionaria-ruiz'), 'Taller López', 5, 'Responden rápido y con buen precio.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'refaccionaria-ruiz') and author_name = 'Taller López' and body = 'Responden rápido y con buen precio.');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Plomería Hernández', 'plomeria-hernandez', 'Plomería a domicilio', 'Fugas, instalaciones, calentadores y destapes. Servicio el mismo día.',
  (select id from public.categories where slug = 'hogar-y-oficios'),
  null,
  '5214420000110', '5214420000110', 'Servicio a domicilio',
  extensions.st_setsrid(extensions.st_makepoint(-100.3245, 20.5992), 4326)::extensions.geography,
  true, true, false, 'plata', 'activo', true, null
where not exists (select 1 from public.businesses where slug = 'plomeria-hernandez');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'plomeria-hernandez'), 'cotizar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'plomeria-hernandez'), 0, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'plomeria-hernandez'), 1, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'plomeria-hernandez'), 2, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'plomeria-hernandez'), 3, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'plomeria-hernandez'), 4, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'plomeria-hernandez'), 5, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'plomeria-hernandez'), 6, '09:00', '20:00') on conflict do nothing;
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'plomeria-hernandez'), 'cotizacion', 'Reparar fuga', 'Visita y diagnóstico', null, null, null, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'plomeria-hernandez') and name = 'Reparar fuga');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'plomeria-hernandez'), 'cotizacion', 'Instalar calentador', null, null, null, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'plomeria-hernandez') and name = 'Instalar calentador');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'plomeria-hernandez'), 'Sofía N.', 5, 'Llegó en una hora y dejó todo limpio.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'plomeria-hernandez') and author_name = 'Sofía N.' and body = 'Llegó en una hora y dejó todo limpio.');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Papelería El Lápiz', 'papeleria-el-lapiz', 'Papelería · impresiones', 'Útiles escolares, copias, impresiones y regalos.',
  (select id from public.categories where slug = 'tiendas'),
  (select id from public.zones where slug = 'zen-house'),
  '5214420000111', '5214420000111', 'Calle Zen 5',
  extensions.st_setsrid(extensions.st_makepoint(-100.3281, 20.6005), 4326)::extensions.geography,
  true, true, false, 'plata', 'activo', false, null
where not exists (select 1 from public.businesses where slug = 'papeleria-el-lapiz');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'papeleria-el-lapiz'), 'ordenar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'papeleria-el-lapiz'), 0, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'papeleria-el-lapiz'), 1, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'papeleria-el-lapiz'), 2, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'papeleria-el-lapiz'), 3, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'papeleria-el-lapiz'), 4, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'papeleria-el-lapiz'), 5, '09:00', '20:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'papeleria-el-lapiz'), 6, '09:00', '20:00') on conflict do nothing;
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'papeleria-el-lapiz'), 'producto', 'Impresión a color', 'Por hoja', null, 8, null, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'papeleria-el-lapiz') and name = 'Impresión a color');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'papeleria-el-lapiz'), 'producto', 'Cuaderno profesional', null, null, 45, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'papeleria-el-lapiz') and name = 'Cuaderno profesional');

insert into public.businesses (name, slug, subtitle, description, category_id, zone_id, phone, whatsapp, address, location, is_open, accepts_orders, delivers, plan, status, verified, promo)
select 'Repostería Dulce Bruma', 'reposteria-dulce-bruma', 'Pasteles por encargo', 'Pasteles, cupcakes y mesas de postres por encargo.',
  (select id from public.categories where slug = 'cafe-y-postres'),
  (select id from public.zones where slug = 'el-mirador'),
  '5214420000112', '5214420000112', 'Calle Jazmín 41',
  extensions.st_setsrid(extensions.st_makepoint(-100.3302, 20.5979), 4326)::extensions.geography,
  true, true, true, 'plata', 'activo', true, null
where not exists (select 1 from public.businesses where slug = 'reposteria-dulce-bruma');

insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'reposteria-dulce-bruma'), 'ordenar') on conflict do nothing;
insert into public.business_modules (business_id, module) values ((select id from public.businesses where slug = 'reposteria-dulce-bruma'), 'cotizar') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'reposteria-dulce-bruma'), 0, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'reposteria-dulce-bruma'), 1, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'reposteria-dulce-bruma'), 2, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'reposteria-dulce-bruma'), 3, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'reposteria-dulce-bruma'), 4, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'reposteria-dulce-bruma'), 5, '09:00', '19:00') on conflict do nothing;
insert into public.business_hours (business_id, weekday, opens, closes) values ((select id from public.businesses where slug = 'reposteria-dulce-bruma'), 6, '09:00', '19:00') on conflict do nothing;
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'reposteria-dulce-bruma'), 'producto', 'Rebanada de pastel', null, 'Del día', 65, null, true, 0 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'reposteria-dulce-bruma') and name = 'Rebanada de pastel');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'reposteria-dulce-bruma'), 'producto', 'Caja de 6 cupcakes', null, 'Del día', 180, null, true, 1 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'reposteria-dulce-bruma') and name = 'Caja de 6 cupcakes');
insert into public.catalog_items (business_id, kind, name, description, section, price, duration_min, is_available, position) select (select id from public.businesses where slug = 'reposteria-dulce-bruma'), 'cotizacion', 'Pastel personalizado', 'Dinos tema y número de personas', 'Encargos', null, null, true, 2 where not exists (select 1 from public.catalog_items where business_id = (select id from public.businesses where slug = 'reposteria-dulce-bruma') and name = 'Pastel personalizado');
insert into public.reviews (business_id, author_name, rating, body, reply) select (select id from public.businesses where slug = 'reposteria-dulce-bruma'), 'Laura M.', 5, 'El pastel de cumpleaños quedó idéntico a la foto.', null where not exists (select 1 from public.reviews where business_id = (select id from public.businesses where slug = 'reposteria-dulce-bruma') and author_name = 'Laura M.' and body = 'El pastel de cumpleaños quedó idéntico a la foto.');

-- Anuncios al abrir la app (activos durante 30 días)
insert into public.opening_ads (business_id, headline, body, cta, color, status) select (select id from public.businesses where slug = 'cafe-la-esquina'), '2x1 en waffles', 'Hoy de 4 a 6 pm. Enseña la app en caja.', 'Ver menú', '#E04A1F', 'activa' where not exists (select 1 from public.opening_ads where business_id = (select id from public.businesses where slug = 'cafe-la-esquina') and headline = '2x1 en waffles');
insert into public.opening_ads (business_id, headline, body, cta, color, status) select (select id from public.businesses where slug = 'estetica-bella-luna'), '30% en tu primera visita', 'Corte, tinte o uñas. Agenda desde aquí.', 'Reservar', '#E8457C', 'activa' where not exists (select 1 from public.opening_ads where business_id = (select id from public.businesses where slug = 'estetica-bella-luna') and headline = '30% en tu primera visita');
insert into public.opening_ads (business_id, headline, body, cta, color, status) select (select id from public.businesses where slug = 'reposteria-dulce-bruma'), 'Pasteles por encargo', 'Pide hoy y recógelo mañana en Zen House.', 'Ver pasteles', '#7B4FE0', 'activa' where not exists (select 1 from public.opening_ads where business_id = (select id from public.businesses where slug = 'reposteria-dulce-bruma') and headline = 'Pasteles por encargo');
insert into public.opening_ads (business_id, headline, body, cta, color, status) select (select id from public.businesses where slug = 'fonda-dona-lupe'), 'Postre gratis', 'En pedidos desde $250 a domicilio.', 'Pedir comida', '#12A06E', 'activa' where not exists (select 1 from public.opening_ads where business_id = (select id from public.businesses where slug = 'fonda-dona-lupe') and headline = 'Postre gratis');
