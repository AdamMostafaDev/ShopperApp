// MyUS Shopping Categories Structure
export interface Category {
  id: string;
  name: string;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
}

export const categories: Category[] = [
  {
    id: 'arts-crafts-sewing',
    name: 'Arts, Crafts & Sewing',
    subcategories: [
      { id: 'art-supplies', name: 'Art Supplies' },
      { id: 'crafting', name: 'Crafting' },
      { id: 'fabric', name: 'Fabric' },
      { id: 'knitting-crochet', name: 'Knitting & Crochet' },
      { id: 'scrapbooking', name: 'Scrapbooking' },
      { id: 'sewing', name: 'Sewing' }
    ]
  },
  {
    id: 'automotive',
    name: 'Automotive',
    subcategories: [
      { id: 'car-care', name: 'Car Care' },
      { id: 'car-electronics', name: 'Car Electronics' },
      { id: 'exterior-accessories', name: 'Exterior Accessories' },
      { id: 'interior-accessories', name: 'Interior Accessories' },
      { id: 'lights-lighting', name: 'Lights & Lighting' },
      { id: 'motorcycle-powersports', name: 'Motorcycle & Powersports' },
      { id: 'oils-fluids', name: 'Oils & Fluids' },
      { id: 'paint-body-repair', name: 'Paint & Body Repair' },
      { id: 'performance-parts', name: 'Performance Parts & Accessories' },
      { id: 'replacement-parts', name: 'Replacement Parts' },
      { id: 'rv-parts', name: 'RV Parts & Accessories' },
      { id: 'tires-wheels', name: 'Tires & Wheels' },
      { id: 'tools-equipment', name: 'Tools & Equipment' }
    ]
  },
  {
    id: 'baby',
    name: 'Baby',
    subcategories: [
      { id: 'activity-entertainment', name: 'Activity & Entertainment' },
      { id: 'apparel-accessories', name: 'Apparel & Accessories' },
      { id: 'baby-care', name: 'Baby Care' },
      { id: 'baby-stationery', name: 'Baby Stationery' },
      { id: 'diapering', name: 'Diapering' },
      { id: 'feeding', name: 'Feeding' },
      { id: 'gifts', name: 'Gifts' },
      { id: 'nursery', name: 'Nursery' },
      { id: 'potty-training', name: 'Potty Training' },
      { id: 'pregnancy-maternity', name: 'Pregnancy & Maternity' },
      { id: 'safety', name: 'Safety' },
      { id: 'travel-gear', name: 'Travel Gear' }
    ]
  },
  {
    id: 'beauty',
    name: 'Beauty',
    subcategories: [
      { id: 'fragrance', name: 'Fragrance' },
      { id: 'hair-care', name: 'Hair Care' },
      { id: 'makeup', name: 'Makeup' },
      { id: 'mens-grooming', name: 'Men\'s Grooming' },
      { id: 'nail-art', name: 'Nail Art & Polish' },
      { id: 'personal-care', name: 'Personal Care' },
      { id: 'skin-care', name: 'Skin Care' },
      { id: 'tools-accessories', name: 'Tools & Accessories' }
    ]
  },
  {
    id: 'books',
    name: 'Books',
    subcategories: [
      { id: 'audiobooks', name: 'Audiobooks' },
      { id: 'biographies', name: 'Biographies & Memoirs' },
      { id: 'business-money', name: 'Business & Money' },
      { id: 'childrens-books', name: 'Children\'s Books' },
      { id: 'comics-graphic-novels', name: 'Comics & Graphic Novels' },
      { id: 'computers-technology', name: 'Computers & Technology' },
      { id: 'cookbooks', name: 'Cookbooks, Food & Wine' },
      { id: 'crafts-hobbies', name: 'Crafts, Hobbies & Home' },
      { id: 'education-teaching', name: 'Education & Teaching' },
      { id: 'health-fitness', name: 'Health, Fitness & Dieting' },
      { id: 'history', name: 'History' },
      { id: 'humor-entertainment', name: 'Humor & Entertainment' },
      { id: 'literature-fiction', name: 'Literature & Fiction' },
      { id: 'mystery-thriller', name: 'Mystery, Thriller & Suspense' },
      { id: 'parenting-relationships', name: 'Parenting & Relationships' },
      { id: 'politics-social-sciences', name: 'Politics & Social Sciences' },
      { id: 'reference', name: 'Reference' },
      { id: 'religion-spirituality', name: 'Religion & Spirituality' },
      { id: 'romance', name: 'Romance' },
      { id: 'science-fiction-fantasy', name: 'Science Fiction & Fantasy' },
      { id: 'science-math', name: 'Science & Math' },
      { id: 'self-help', name: 'Self-Help' },
      { id: 'sports-outdoors', name: 'Sports & Outdoors' },
      { id: 'teen-young-adult', name: 'Teen & Young Adult' },
      { id: 'test-preparation', name: 'Test Preparation' },
      { id: 'travel', name: 'Travel' }
    ]
  },
  {
    id: 'cds-vinyl',
    name: 'CDs & Vinyl',
    subcategories: [
      { id: 'alternative-rock', name: 'Alternative Rock' },
      { id: 'blues', name: 'Blues' },
      { id: 'broadway-vocalists', name: 'Broadway & Vocalists' },
      { id: 'childrens-music', name: 'Children\'s Music' },
      { id: 'christian-gospel', name: 'Christian & Gospel' },
      { id: 'classic-rock', name: 'Classic Rock' },
      { id: 'classical', name: 'Classical' },
      { id: 'country', name: 'Country' },
      { id: 'dance-electronic', name: 'Dance & Electronic' },
      { id: 'folk', name: 'Folk' },
      { id: 'hard-rock-metal', name: 'Hard Rock & Metal' },
      { id: 'international-music', name: 'International Music' },
      { id: 'jazz', name: 'Jazz' },
      { id: 'latin-music', name: 'Latin Music' },
      { id: 'new-age', name: 'New Age' },
      { id: 'pop', name: 'Pop' },
      { id: 'rb-soul', name: 'R&B & Soul' },
      { id: 'rap-hip-hop', name: 'Rap & Hip-Hop' },
      { id: 'rock', name: 'Rock' },
      { id: 'soundtracks', name: 'Soundtracks' }
    ]
  },
  {
    id: 'clothing-shoes-jewelry',
    name: 'Clothing, Shoes & Jewelry',
    subcategories: [
      { id: 'womens-clothing', name: 'Women\'s Clothing' },
      { id: 'mens-clothing', name: 'Men\'s Clothing' },
      { id: 'girls-clothing', name: 'Girls\' Clothing' },
      { id: 'boys-clothing', name: 'Boys\' Clothing' },
      { id: 'womens-shoes', name: 'Women\'s Shoes' },
      { id: 'mens-shoes', name: 'Men\'s Shoes' },
      { id: 'girls-shoes', name: 'Girls\' Shoes' },
      { id: 'boys-shoes', name: 'Boys\' Shoes' },
      { id: 'womens-jewelry', name: 'Women\'s Jewelry' },
      { id: 'mens-jewelry', name: 'Men\'s Jewelry' },
      { id: 'girls-jewelry', name: 'Girls\' Jewelry' },
      { id: 'boys-jewelry', name: 'Boys\' Jewelry' },
      { id: 'womens-handbags', name: 'Women\'s Handbags & Wallets' },
      { id: 'mens-accessories', name: 'Men\'s Accessories' },
      { id: 'luggage-travel', name: 'Luggage & Travel Gear' },
      { id: 'accessories', name: 'Accessories' }
    ]
  },
  {
    id: 'electronics',
    name: 'Electronics',
    subcategories: [
      { id: 'accessories-supplies', name: 'Accessories & Supplies' },
      { id: 'camera-photo', name: 'Camera & Photo' },
      { id: 'car-vehicle-electronics', name: 'Car & Vehicle Electronics' },
      { id: 'cell-phones-accessories', name: 'Cell Phones & Accessories' },
      { id: 'computers-accessories', name: 'Computers & Accessories' },
      { id: 'gps-navigation', name: 'GPS & Navigation' },
      { id: 'headphones', name: 'Headphones' },
      { id: 'home-audio', name: 'Home Audio' },
      { id: 'office-electronics', name: 'Office Electronics' },
      { id: 'portable-audio-video', name: 'Portable Audio & Video' },
      { id: 'security-surveillance', name: 'Security & Surveillance' },
      { id: 'service-plans', name: 'Service Plans' },
      { id: 'television-video', name: 'Television & Video' },
      { id: 'video-game-consoles', name: 'Video Game Consoles & Accessories' },
      { id: 'wearable-technology', name: 'Wearable Technology' }
    ]
  },
  {
    id: 'health-personal-care',
    name: 'Health & Personal Care',
    subcategories: [
      { id: 'baby-child-care', name: 'Baby & Child Care' },
      { id: 'health-care', name: 'Health Care' },
      { id: 'household-supplies', name: 'Household Supplies' },
      { id: 'medical-supplies', name: 'Medical Supplies & Equipment' },
      { id: 'oral-care', name: 'Oral Care' },
      { id: 'personal-care', name: 'Personal Care' },
      { id: 'sexual-wellness', name: 'Sexual Wellness' },
      { id: 'sports-nutrition', name: 'Sports Nutrition' },
      { id: 'stationery-gift-wrapping', name: 'Stationery & Gift Wrapping Supplies' },
      { id: 'vision-care', name: 'Vision Care' },
      { id: 'vitamins-supplements', name: 'Vitamins & Dietary Supplements' },
      { id: 'wellness-relaxation', name: 'Wellness & Relaxation' }
    ]
  },
  {
    id: 'home-kitchen',
    name: 'Home & Kitchen',
    subcategories: [
      { id: 'bath', name: 'Bath' },
      { id: 'bedding', name: 'Bedding' },
      { id: 'decor', name: 'Decor' },
      { id: 'furniture', name: 'Furniture' },
      { id: 'heating-cooling', name: 'Heating, Cooling & Air Quality' },
      { id: 'home-automation', name: 'Home Automation' },
      { id: 'iron-steam', name: 'Irons & Steamers' },
      { id: 'kitchen-dining', name: 'Kitchen & Dining' },
      { id: 'lighting', name: 'Lighting & Ceiling Fans' },
      { id: 'rugs-pads', name: 'Rugs, Pads & Protectors' },
      { id: 'seasonal-decor', name: 'Seasonal Décor' },
      { id: 'storage-organization', name: 'Storage & Organization' },
      { id: 'vacuums-floor-care', name: 'Vacuums & Floor Care' },
      { id: 'wall-art', name: 'Wall Art' },
      { id: 'window-treatments', name: 'Window Treatments' }
    ]
  },
  {
    id: 'office-products',
    name: 'Office Products',
    subcategories: [
      { id: 'basic-supplies', name: 'Basic Office Supplies' },
      { id: 'binders-accessories', name: 'Binders & Accessories' },
      { id: 'calendars-planners', name: 'Calendars, Planners & Personal Organizers' },
      { id: 'cards-card-stock', name: 'Cards & Card Stock' },
      { id: 'cutting-measuring', name: 'Cutting & Measuring Devices' },
      { id: 'desk-accessories', name: 'Desk Accessories & Workspace Organizers' },
      { id: 'envelopes-mailers', name: 'Envelopes, Mailers & Shipping Supplies' },
      { id: 'filing-products', name: 'Filing Products' },
      { id: 'forms-recordkeeping', name: 'Forms, Recordkeeping & Money Handling' },
      { id: 'labels-indexes', name: 'Labels, Indexes & Stamps' },
      { id: 'laminating-machines', name: 'Laminating Machines & Supplies' },
      { id: 'markers-highlighters', name: 'Markers & Highlighters' },
      { id: 'notebooks-writing-pads', name: 'Notebooks & Writing Pads' },
      { id: 'office-electronics', name: 'Office Electronics' },
      { id: 'office-furniture', name: 'Office Furniture & Lighting' },
      { id: 'paper', name: 'Paper' },
      { id: 'pens-pencils', name: 'Pens & Pencils' },
      { id: 'presentation-supplies', name: 'Presentation Supplies' },
      { id: 'school-supplies', name: 'School & Educational Supplies' },
      { id: 'tape-adhesives', name: 'Tape, Adhesives & Fasteners' }
    ]
  },
  {
    id: 'patio-lawn-garden',
    name: 'Patio, Lawn & Garden',
    subcategories: [
      { id: 'decking', name: 'Decking' },
      { id: 'farm-ranch', name: 'Farm & Ranch' },
      { id: 'fencing', name: 'Fencing' },
      { id: 'fire-pits', name: 'Fire Pits & Outdoor Fireplaces' },
      { id: 'furniture-sets', name: 'Furniture Sets' },
      { id: 'gardening-lawn-care', name: 'Gardening & Lawn Care' },
      { id: 'generators-power', name: 'Generators & Portable Power' },
      { id: 'grills-outdoor-cooking', name: 'Grills & Outdoor Cooking' },
      { id: 'outdoor-decor', name: 'Outdoor Décor' },
      { id: 'outdoor-heating', name: 'Outdoor Heating' },
      { id: 'outdoor-power-tools', name: 'Outdoor Power Tools' },
      { id: 'parasols-shade', name: 'Parasols & Shade Structures' },
      { id: 'patio-furniture', name: 'Patio Furniture & Accessories' },
      { id: 'pools-spas', name: 'Pools, Hot Tubs & Supplies' },
      { id: 'snow-removal', name: 'Snow Removal' }
    ]
  },
  {
    id: 'pet-supplies',
    name: 'Pet Supplies',
    subcategories: [
      { id: 'birds', name: 'Birds' },
      { id: 'cats', name: 'Cats' },
      { id: 'dogs', name: 'Dogs' },
      { id: 'fish-aquatic-pets', name: 'Fish & Aquatic Pets' },
      { id: 'horses', name: 'Horses' },
      { id: 'reptiles-amphibians', name: 'Reptiles & Amphibians' },
      { id: 'small-animals', name: 'Small Animals' }
    ]
  },
  {
    id: 'sports-outdoors',
    name: 'Sports & Outdoors',
    subcategories: [
      { id: 'outdoor-recreation', name: 'Outdoor Recreation' },
      { id: 'sports-fitness', name: 'Sports & Fitness' },
      { id: 'fan-shop', name: 'Fan Shop' }
    ]
  },
  {
    id: 'tools-home-improvement',
    name: 'Tools & Home Improvement',
    subcategories: [
      { id: 'appliances', name: 'Appliances' },
      { id: 'building-supplies', name: 'Building Supplies' },
      { id: 'electrical', name: 'Electrical' },
      { id: 'hardware', name: 'Hardware' },
      { id: 'kitchen-bath-fixtures', name: 'Kitchen & Bath Fixtures' },
      { id: 'light-bulbs', name: 'Light Bulbs' },
      { id: 'lighting-ceiling-fans', name: 'Lighting & Ceiling Fans' },
      { id: 'measuring-layout-tools', name: 'Measuring & Layout Tools' },
      { id: 'painting-supplies', name: 'Painting Supplies & Wall Treatments' },
      { id: 'plumbing', name: 'Plumbing' },
      { id: 'power-hand-tools', name: 'Power & Hand Tools' },
      { id: 'rough-plumbing', name: 'Rough Plumbing' },
      { id: 'safety-security', name: 'Safety & Security' },
      { id: 'storage-organization', name: 'Storage & Home Organization' },
      { id: 'welding-soldering', name: 'Welding & Soldering' }
    ]
  },
  {
    id: 'toys-games',
    name: 'Toys & Games',
    subcategories: [
      { id: 'action-figures', name: 'Action Figures & Statues' },
      { id: 'arts-crafts', name: 'Arts & Crafts' },
      { id: 'baby-toddler-toys', name: 'Baby & Toddler Toys' },
      { id: 'board-games', name: 'Board Games' },
      { id: 'building-toys', name: 'Building Toys' },
      { id: 'dolls-accessories', name: 'Dolls & Accessories' },
      { id: 'dress-up', name: 'Dress Up & Pretend Play' },
      { id: 'electronic-toys', name: 'Electronic Toys' },
      { id: 'games', name: 'Games' },
      { id: 'grown-up-toys', name: 'Grown-Up Toys' },
      { id: 'hobbies', name: 'Hobbies' },
      { id: 'kids-electronics', name: 'Kids\' Electronics' },
      { id: 'learning-education', name: 'Learning & Education' },
      { id: 'novelty-gag-toys', name: 'Novelty & Gag Toys' },
      { id: 'party-supplies', name: 'Party Supplies' },
      { id: 'puzzles', name: 'Puzzles' },
      { id: 'sports-outdoor-play', name: 'Sports & Outdoor Play' },
      { id: 'stuffed-animals', name: 'Stuffed Animals & Plush Toys' },
      { id: 'toy-remote-control', name: 'Toy Remote Control & Play Vehicles' },
      { id: 'tricycles-scooters', name: 'Tricycles, Scooters & Wagons' }
    ]
  },
  {
    id: 'video-games',
    name: 'Video Games',
    subcategories: [
      { id: 'pc-games', name: 'PC Games' },
      { id: 'playstation-4', name: 'PlayStation 4' },
      { id: 'playstation-5', name: 'PlayStation 5' },
      { id: 'xbox-one', name: 'Xbox One' },
      { id: 'xbox-series-x-s', name: 'Xbox Series X|S' },
      { id: 'nintendo-switch', name: 'Nintendo Switch' },
      { id: 'nintendo-3ds', name: 'Nintendo 3DS' },
      { id: 'legacy-systems', name: 'Legacy Systems' },
      { id: 'accessories', name: 'Accessories' },
      { id: 'digital-games', name: 'Digital Games' }
    ]
  }
];

// Helper functions
export const getCategoryById = (id: string): Category | undefined => {
  return categories.find(cat => cat.id === id);
};

export const getSubcategoryById = (categoryId: string, subcategoryId: string): Subcategory | undefined => {
  const category = getCategoryById(categoryId);
  return category?.subcategories?.find(sub => sub.id === subcategoryId);
};

export const getAllSubcategories = (): { categoryId: string; subcategory: Subcategory }[] => {
  const result: { categoryId: string; subcategory: Subcategory }[] = [];
  categories.forEach(category => {
    category.subcategories?.forEach(subcategory => {
      result.push({ categoryId: category.id, subcategory });
    });
  });
  return result;
};
