-- Meme-format template SVGs with per-format text overlay boxes
update public.party_templates
set
  image_path = 'meme-01-drake.svg',
  text_boxes = '[{"id":"top","x":0.05,"y":0.03,"w":0.9,"h":0.2,"align":"center","maxLines":2},{"id":"bottom","x":0.05,"y":0.53,"w":0.9,"h":0.2,"align":"center","maxLines":2}]'::jsonb
where sort_order = 1;

update public.party_templates
set
  image_path = 'meme-02-boyfriend.svg',
  text_boxes = '[{"id":"left","x":0.03,"y":0.68,"w":0.28,"h":0.28,"align":"center","maxLines":2},{"id":"mid","x":0.36,"y":0.68,"w":0.28,"h":0.28,"align":"center","maxLines":2},{"id":"right","x":0.69,"y":0.68,"w":0.28,"h":0.28,"align":"center","maxLines":2}]'::jsonb
where sort_order = 2;

update public.party_templates
set
  image_path = 'meme-03-brain.svg',
  text_boxes = '[{"id":"q1","x":0.04,"y":0.06,"w":0.42,"h":0.18,"align":"center","maxLines":2},{"id":"q2","x":0.54,"y":0.06,"w":0.42,"h":0.18,"align":"center","maxLines":2},{"id":"q3","x":0.04,"y":0.52,"w":0.42,"h":0.18,"align":"center","maxLines":2},{"id":"q4","x":0.54,"y":0.52,"w":0.42,"h":0.18,"align":"center","maxLines":2}]'::jsonb
where sort_order = 3;

update public.party_templates
set
  image_path = 'meme-04-surprised.svg',
  text_boxes = '[{"id":"top","x":0.05,"y":0.04,"w":0.9,"h":0.18,"align":"center","maxLines":2},{"id":"bottom","x":0.05,"y":0.78,"w":0.9,"h":0.18,"align":"center","maxLines":2}]'::jsonb
where sort_order = 4;

update public.party_templates
set
  image_path = 'meme-05-split.svg',
  text_boxes = '[{"id":"left","x":0.04,"y":0.72,"w":0.42,"h":0.22,"align":"center","maxLines":2},{"id":"right","x":0.54,"y":0.72,"w":0.42,"h":0.22,"align":"center","maxLines":2}]'::jsonb
where sort_order = 5;

update public.party_templates
set
  image_path = 'meme-06-sign.svg',
  text_boxes = '[{"id":"sign","x":0.12,"y":0.38,"w":0.76,"h":0.28,"align":"center","maxLines":3}]'::jsonb
where sort_order = 6;

update public.party_templates
set
  image_path = 'meme-07-fine.svg',
  text_boxes = '[{"id":"top","x":0.05,"y":0.05,"w":0.9,"h":0.2,"align":"center","maxLines":2},{"id":"bottom","x":0.05,"y":0.75,"w":0.9,"h":0.2,"align":"center","maxLines":2}]'::jsonb
where sort_order = 7;

update public.party_templates
set
  image_path = 'meme-08-stonks.svg',
  text_boxes = '[{"id":"top","x":0.05,"y":0.06,"w":0.9,"h":0.22,"align":"center","maxLines":2},{"id":"bottom","x":0.05,"y":0.72,"w":0.9,"h":0.22,"align":"center","maxLines":2}]'::jsonb
where sort_order = 8;
