export interface MyUSCategory {
  id: string;
  name: string;
  subcategories?: MyUSSubcategory[];
}

export interface MyUSSubcategory {
  id: string;
  name: string;
}

export const myusCategories: MyUSCategory[] = [
  {
    id: 'automotive',
    name: 'Automotive',
    subcategories: [
      { id: 'car-care', name: 'Car Care' },
      { id: 'car-electronics', name: 'Car Electronics & Accessories' },
      { id: 'exterior-accessories', name: 'Exterior Accessories' },
      { id: 'interior-accessories', name: 'Interior Accessories' },
      { id: 'lights-lighting', name: 'Lights & Lighting Accessories' },
      { id: 'motorcycle-powersports', name: 'Motorcycle & Powersports' },
      { id: 'performance-parts', name: 'Performance Parts & Accessories' },
      { id: 'replacement-parts', name: 'Replacement Parts' },
      { id: 'rv-parts', name: 'RV Parts & Accessories' },
      { id: 'tools-equipment', name: 'Tools & Equipment' }
    ]
  },
  {
    id: 'arts-crafts',
    name: 'Arts, Crafts & Sewing',
    subcategories: [
      { id: 'art-supplies', name: 'Art Supplies' },
      { id: 'beading-jewelry', name: 'Beading & Jewelry Making' },
      { id: 'crafting', name: 'Crafting' },
      { id: 'fabric', name: 'Fabric' },
      { id: 'knitting-crochet', name: 'Knitting & Crochet' },
      { id: 'needlework', name: 'Needlework' },
      { id: 'organization', name: 'Organization, Storage & Transport' },
      { id: 'painting', name: 'Painting, Drawing & Art Supplies' },
      { id: 'scrapbooking', name: 'Scrapbooking & Stamping' },
      { id: 'sewing', name: 'Sewing' }
    ]
  },
  {
    id: 'baby',
    name: 'Baby',
    subcategories: [
      { id: 'activity', name: 'Activity & Entertainment' },
      { id: 'apparel', name: 'Apparel & Accessories' },
      { id: 'baby-care', name: 'Baby Care' },
      { id: 'diapering', name: 'Diapering' },
      { id: 'feeding', name: 'Feeding' },
      { id: 'gifts', name: 'Gifts' },
      { id: 'nursery', name: 'Nursery' },
      { id: 'potty-training', name: 'Potty Training' },
      { id: 'pregnancy', name: 'Pregnancy & Maternity' },
      { id: 'safety', name: 'Safety' },
      { id: 'strollers', name: 'Strollers & Accessories' },
      { id: 'travel-gear', name: 'Travel Gear' }
    ]
  },
  {
    id: 'beauty',
    name: 'Beauty',
    subcategories: [
      { id: 'makeup', name: 'Makeup' },
      { id: 'skin-care', name: 'Skin Care' },
      { id: 'hair-care', name: 'Hair Care' },
      { id: 'fragrance', name: 'Fragrance' },
      { id: 'tools', name: 'Tools & Accessories' },
      { id: 'nail-care', name: 'Nail Care' },
      { id: 'mens-grooming', name: 'Men\'s Grooming' }
    ]
  },
  {
    id: 'electronics',
    name: 'Electronics',
    subcategories: [
      { id: 'accessories', name: 'Accessories & Supplies' },
      { id: 'camera', name: 'Camera & Photo' },
      { id: 'car-electronics', name: 'Car & Vehicle Electronics' },
      { id: 'cell-phones', name: 'Cell Phones & Accessories' },
      { id: 'computers', name: 'Computers & Accessories' },
      { id: 'gps', name: 'GPS & Navigation' },
      { id: 'headphones', name: 'Headphones' },
      { id: 'home-audio', name: 'Home Audio' },
      { id: 'office-electronics', name: 'Office Electronics' },
      { id: 'portable-audio', name: 'Portable Audio & Video' },
      { id: 'security', name: 'Security & Surveillance' },
      { id: 'tv-video', name: 'Television & Video' },
      { id: 'wearables', name: 'Wearable Technology' }
    ]
  },
  {
    id: 'health',
    name: 'Health & Personal Care',
    subcategories: [
      { id: 'health-care', name: 'Health Care' },
      { id: 'household', name: 'Household Supplies' },
      { id: 'medical-supplies', name: 'Medical Supplies & Equipment' },
      { id: 'oral-care', name: 'Oral Care' },
      { id: 'personal-care', name: 'Personal Care' },
      { id: 'sexual-wellness', name: 'Sexual Wellness' },
      { id: 'sports-nutrition', name: 'Sports Nutrition' },
      { id: 'vision-care', name: 'Vision Care' },
      { id: 'vitamins', name: 'Vitamins & Dietary Supplements' },
      { id: 'wellness', name: 'Wellness & Relaxation' }
    ]
  },
  {
    id: 'home-kitchen',
    name: 'Home & Kitchen',
    subcategories: [
      { id: 'bath', name: 'Bath' },
      { id: 'bedding', name: 'Bedding' },
      { id: 'furniture', name: 'Furniture' },
      { id: 'home-decor', name: 'Home Décor' },
      { id: 'kitchen-dining', name: 'Kitchen & Dining' },
      { id: 'lighting', name: 'Lighting & Ceiling Fans' },
      { id: 'storage', name: 'Storage & Organization' },
      { id: 'vacuums', name: 'Vacuums & Floor Care' },
      { id: 'wall-art', name: 'Wall Art' },
      { id: 'window', name: 'Window Treatments' }
    ]
  }
];

// Helper functions
export const getCategoryById = (id: string): MyUSCategory | undefined => {
  return myusCategories.find(cat => cat.id === id);
};

export const getSubcategoryById = (categoryId: string, subcategoryId: string): MyUSSubcategory | undefined => {
  const category = getCategoryById(categoryId);
  return category?.subcategories?.find(sub => sub.id === subcategoryId);
};

export const buildSearchQuery = (categoryId: string, subcategoryId?: string): string => {
  const category = getCategoryById(categoryId);
  const subcategory = subcategoryId ? getSubcategoryById(categoryId, subcategoryId) : undefined;
  
  if (subcategory) {
    return `${category?.name} ${subcategory.name}`;
  }
  return category?.name || '';
};
