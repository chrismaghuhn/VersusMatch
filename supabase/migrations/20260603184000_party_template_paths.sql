-- Point templates at uploaded SVG placeholders (bucket was empty before)
update public.party_templates
set image_path = 'placeholder-1.svg'
where image_path in ('party-templates/placeholder-1.webp', 'placeholder-1.webp');

update public.party_templates
set image_path = 'placeholder-2.svg'
where image_path in ('party-templates/placeholder-2.webp', 'placeholder-2.webp');

update public.party_templates
set image_path = 'placeholder-3.svg'
where image_path in ('party-templates/placeholder-3.webp', 'placeholder-3.webp');
