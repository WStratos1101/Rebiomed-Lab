INSERT INTO `calculators` (`slug`, `name`, `category`, `formula`, `description`, `config`, `status`, `active`)
SELECT
  'surface-oxygen',
  'Tính O₂ tại bề mặt tế bào',
  'Hypoxia',
  'DO bề mặt ≈ DO ban đầu − tiêu thụ − gradient khuếch tán',
  'Ước tính O₂ hòa tan tại bề mặt tế bào theo format giếng, lượng môi trường, OCR và thời gian.',
  JSON_OBJECT(
    'model', 'one-dimensional-diffusion-screening',
    'references', JSON_ARRAY('https://pmc.ncbi.nlm.nih.gov/articles/PMC5699948/', 'https://www.mdpi.com/2073-4409/9/11/2456')
  ),
  'Đã duyệt',
  1
WHERE NOT EXISTS (
  SELECT 1 FROM `calculators` WHERE `slug` = 'surface-oxygen'
);
