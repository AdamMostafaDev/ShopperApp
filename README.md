# UniShopper - International Shopping Platform

A modern web application inspired by MyUS.com that allows international customers to shop from US stores like Amazon, Walmart, and eBay with package forwarding services.

## 🚀 Features

- **Smart Shopping**: Browse and search products from major US retailers
- **Link Capture**: Paste any Amazon, Walmart, or eBay product link to automatically capture product details
- **Shopping Cart**: Add items to cart with quantity management
- **Package Forwarding**: Simulated US address for international shipping
- **Responsive Design**: Modern UI built with Tailwind CSS
- **Best Sellers**: Curated product recommendations

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **State Management**: React Context API
- **Web Scraping**: Puppeteer, Cheerio, JSDOM
- **Anti-Bot Protection**: User-Agents rotation
- **Development**: ESLint for code quality

## 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd unishopper
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:3000`

## 🌟 Key Pages

### Homepage (`/`)
- Hero section with call-to-action
- Features overview
- How it works section
- Benefits of using the service

### Shopping Page (`/shopping`)
- Product search functionality
- Link capture for Amazon, Walmart, eBay products
- Best sellers section
- Add to cart functionality

### Cart Page (`/cart`)
- View cart items
- Update quantities
- Remove items
- Order summary
- Checkout flow

## 🔧 Core Components

### Advanced Web Scraping System
The application includes a comprehensive web scraping system that can:
- **Real-time Product Extraction**: Captures live product data from Amazon, Walmart, and eBay
- **Intelligent Store Detection**: Automatically identifies the retailer from any product URL
- **Anti-Bot Protection**: Uses Puppeteer with rotating user agents and stealth techniques
- **Comprehensive Data Extraction**: 
  - Product titles and descriptions
  - Current and original prices (with sale detection)
  - High-resolution product images
  - Customer ratings and review counts
  - Product features and specifications
  - Stock availability status
- **Error Handling**: Robust error handling with user-friendly messages
- **Performance Optimized**: Efficient scraping with timeout management

### Cart Management
- React Context-based state management
- Persistent cart across page navigation
- Real-time cart count updates in header
- Quantity management and item removal

### Responsive Design
- Mobile-first approach
- Tailwind CSS for consistent styling
- Modern UI components with hover states
- Accessible design patterns

## 🚧 Development Features

### Mock Data
The application currently uses mock data for demonstration:
- Sample products from different categories
- Realistic pricing and ratings
- Store-specific product variations

### Future Enhancements
- Real product API integration
- User authentication system
- Payment processing
- Order tracking
- International shipping calculator
- Package consolidation features

## 📱 Screenshots

The application features:
- Clean, modern homepage design
- Intuitive shopping interface
- Professional cart management
- Responsive mobile layout

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Links

- **Live Demo**: (Add your deployment URL here)
- **Documentation**: (Add documentation link)
- **API Reference**: (Add API docs when available)

---

Built with ❤️ using Next.js, TypeScript, and Tailwind CSS