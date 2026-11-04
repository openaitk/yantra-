'use strict';
const fs = require('fs');
const path = require('path');
const cat = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalog.json'), 'utf8'));
const IMAGE_MODELS = {};
for (const m of cat.images || []) IMAGE_MODELS[m.id] = { id: m.id, label: m.label, verified: true, provider: m.owned_by, _inr1024: m.pricing_inr_per_image_1024, scale: m.price_scales_with_size ? 'area' : 'flat' };
// price in paise for one image; the live API gives the 1024x1024 price
const pricePaise = (m) => Math.round((m._inr1024 || 0) * 100);
module.exports = { IMAGE_MODELS, pricePaise };
