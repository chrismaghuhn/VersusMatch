-- Point party templates at generated WebP placeholders
update public.party_templates
set image_path = 'placeholder-1.webp'
where image_path in ('placeholder-1.svg', 'party-templates/placeholder-1.webp');

update public.party_templates
set image_path = 'placeholder-2.webp'
where image_path in ('placeholder-2.svg', 'party-templates/placeholder-2.webp');

update public.party_templates
set image_path = 'placeholder-3.webp'
where image_path in ('placeholder-3.svg', 'party-templates/placeholder-3.webp');

update public.party_templates
set image_path = 'placeholder-4.webp'
where image_path = 'placeholder-4.svg';

update public.party_templates
set image_path = 'placeholder-5.webp'
where image_path = 'placeholder-5.svg';

update public.party_templates
set image_path = 'placeholder-6.webp'
where image_path = 'placeholder-6.svg';

update public.party_templates
set image_path = 'placeholder-7.webp'
where image_path = 'placeholder-7.svg';

update public.party_templates
set image_path = 'placeholder-8.webp'
where image_path = 'placeholder-8.svg';
