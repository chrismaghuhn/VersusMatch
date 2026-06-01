-- Expand party template pool from 8 → 20 (Memes templates -HD- pack, batch 2)
insert into public.party_templates (image_path, text_boxes, sort_order, active)
select v.image_path, v.text_boxes, v.sort_order, true
from (
  values
    (
      'meme-09-adios-wormhole.png',
      '[{"id":"left","x":0.02,"y":0.72,"w":0.46,"h":0.22,"align":"center","maxLines":2},{"id":"right","x":0.52,"y":0.72,"w":0.46,"h":0.22,"align":"center","maxLines":2}]'::jsonb,
      9
    ),
    (
      'meme-10-press-f.jpg',
      '[{"id":"top","x":0.05,"y":0.04,"w":0.9,"h":0.12,"align":"center","maxLines":2},{"id":"bottom","x":0.05,"y":0.78,"w":0.9,"h":0.18,"align":"center","maxLines":2}]'::jsonb,
      10
    ),
    (
      'meme-11-soyjak-chad.jpg',
      '[{"id":"left","x":0.02,"y":0.72,"w":0.46,"h":0.22,"align":"center","maxLines":2},{"id":"right","x":0.52,"y":0.72,"w":0.46,"h":0.22,"align":"center","maxLines":2}]'::jsonb,
      11
    ),
    (
      'meme-12-pepe-wojak.jpg',
      '[{"id":"left","x":0.02,"y":0.72,"w":0.46,"h":0.22,"align":"center","maxLines":2},{"id":"right","x":0.52,"y":0.72,"w":0.46,"h":0.22,"align":"center","maxLines":2}]'::jsonb,
      12
    ),
    (
      'meme-13-swole-cheems.jpg',
      '[{"id":"left","x":0.02,"y":0.72,"w":0.46,"h":0.22,"align":"center","maxLines":2},{"id":"right","x":0.52,"y":0.72,"w":0.46,"h":0.22,"align":"center","maxLines":2}]'::jsonb,
      13
    ),
    (
      'meme-14-indiana-jones.jpg',
      '[{"id":"left","x":0.02,"y":0.72,"w":0.46,"h":0.22,"align":"center","maxLines":2},{"id":"right","x":0.52,"y":0.72,"w":0.46,"h":0.22,"align":"center","maxLines":2}]'::jsonb,
      14
    ),
    (
      'meme-15-dune-box.jpg',
      '[{"id":"top","x":0.05,"y":0.04,"w":0.9,"h":0.12,"align":"center","maxLines":2},{"id":"bottom","x":0.05,"y":0.78,"w":0.9,"h":0.18,"align":"center","maxLines":2}]'::jsonb,
      15
    ),
    (
      'meme-16-swallow-pills.jpg',
      '[{"id":"left","x":0.04,"y":0.12,"w":0.42,"h":0.22,"align":"center","maxLines":2},{"id":"right","x":0.52,"y":0.12,"w":0.44,"h":0.35,"align":"center","maxLines":3}]'::jsonb,
      16
    ),
    (
      'meme-17-infinity-stones.png',
      '[{"id":"top","x":0.05,"y":0.04,"w":0.9,"h":0.14,"align":"center","maxLines":2},{"id":"bottom","x":0.05,"y":0.82,"w":0.9,"h":0.14,"align":"center","maxLines":2}]'::jsonb,
      17
    ),
    (
      'meme-18-windows-xp.jpg',
      '[{"id":"title","x":0.08,"y":0.08,"w":0.84,"h":0.18,"align":"center","maxLines":2},{"id":"body","x":0.12,"y":0.38,"w":0.76,"h":0.28,"align":"center","maxLines":3}]'::jsonb,
      18
    ),
    (
      'meme-19-guess-ill-die.jpg',
      '[{"id":"top","x":0.05,"y":0.03,"w":0.9,"h":0.2,"align":"center","maxLines":2},{"id":"bottom","x":0.05,"y":0.53,"w":0.9,"h":0.2,"align":"center","maxLines":2}]'::jsonb,
      19
    ),
    (
      'meme-20-fire-rescue.jpg',
      '[{"id":"left","x":0.02,"y":0.72,"w":0.46,"h":0.22,"align":"center","maxLines":2},{"id":"right","x":0.52,"y":0.72,"w":0.46,"h":0.22,"align":"center","maxLines":2}]'::jsonb,
      20
    )
) as v(image_path, text_boxes, sort_order)
where not exists (
  select 1 from public.party_templates t where t.sort_order = v.sort_order
);
