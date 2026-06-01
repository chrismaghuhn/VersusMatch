-- Additional party template placeholders (placeholder-4..8)
insert into public.party_templates (image_path, text_boxes, sort_order)
select v.image_path, v.text_boxes, v.sort_order
from (
  values
    (
      'placeholder-4.svg',
      '[{"id":"top","x":0.05,"y":0.05,"w":0.9,"h":0.2,"align":"center","maxLines":2},{"id":"bottom","x":0.05,"y":0.75,"w":0.9,"h":0.2,"align":"center","maxLines":2}]'::jsonb,
      4
    ),
    (
      'placeholder-5.svg',
      '[{"id":"top","x":0.05,"y":0.05,"w":0.9,"h":0.2,"align":"center","maxLines":2},{"id":"bottom","x":0.05,"y":0.75,"w":0.9,"h":0.2,"align":"center","maxLines":2}]'::jsonb,
      5
    ),
    (
      'placeholder-6.svg',
      '[{"id":"top","x":0.05,"y":0.05,"w":0.9,"h":0.2,"align":"center","maxLines":2},{"id":"bottom","x":0.05,"y":0.75,"w":0.9,"h":0.2,"align":"center","maxLines":2}]'::jsonb,
      6
    ),
    (
      'placeholder-7.svg',
      '[{"id":"top","x":0.05,"y":0.05,"w":0.9,"h":0.2,"align":"center","maxLines":2},{"id":"bottom","x":0.05,"y":0.75,"w":0.9,"h":0.2,"align":"center","maxLines":2}]'::jsonb,
      7
    ),
    (
      'placeholder-8.svg',
      '[{"id":"top","x":0.05,"y":0.05,"w":0.9,"h":0.2,"align":"center","maxLines":2},{"id":"bottom","x":0.05,"y":0.75,"w":0.9,"h":0.2,"align":"center","maxLines":2}]'::jsonb,
      8
    )
) as v(image_path, text_boxes, sort_order)
where not exists (
  select 1 from public.party_templates t where t.image_path = v.image_path
);
