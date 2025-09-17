'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCart } from '@/lib/cart-context';
import { formatBdtPrice } from '@/lib/currency';
import { calculateCartTotals } from '@/lib/shipping';
import { displayShipping } from '@/lib/display-utils';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import countryList from 'react-select-country-list';
import { type AddressComponents } from '@/lib/address-validation';

interface Address {
  id: number;
  firstName?: string;
  lastName?: string;
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

interface CheckoutFormData {
  firstName: string;
  lastName: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

export default function InformationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { state, isInitialized } = useCart();
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CheckoutFormData>({
    firstName: '',
    lastName: '',
    street1: '',
    street2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phone: '',
  });

  // Country/State data
  const countryData = countryList().getData();
  const countries = countryData.map(country => ({
    value: country.label,
    label: country.label,
    code: country.value
  }));

  const getStatesForCountry = (countryName: string) => {
    if (countryName === 'United States') {
      return [
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
        'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
        'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
        'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
        'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
        'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
        'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
      ].map(state => ({ value: state, label: state }));
    } else if (countryName === 'Canada') {
      return [
        'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
        'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
        'Quebec', 'Saskatchewan', 'Yukon'
      ].map(province => ({ value: province, label: province }));
    } else if (countryName === 'Australia') {
      return [
        'Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland',
        'South Australia', 'Tasmania', 'Victoria', 'Western Australia'
      ].map(state => ({ value: state, label: state }));
    }
    return [];
  };

  const [availableStates, setAvailableStates] = useState(getStatesForCountry(formData.country));
  const hasStates = availableStates.length > 0;


  // Calculate cart totals
  const totals = calculateCartTotals(
    state.cart.items.map(item => ({
      price: item.product.price,
      quantity: item.quantity,
      weight: item.product.weight
    }))
  );

  // Load addresses and populate default
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!session?.user) {
        // For non-authenticated users, check if they have shipping info in session storage
        const storedAddress = sessionStorage.getItem('shippingAddress');
        if (storedAddress) {
          try {
            const address = JSON.parse(storedAddress);
            setFormData({
              firstName: address.firstName || '',
              lastName: address.lastName || '',
              street1: address.street1 || '',
              street2: address.street2 || '',
              city: address.city || '',
              state: address.state || '',
              postalCode: address.postalCode || '',
              country: address.country || 'Bangladesh',
              phone: address.phone || '',
            });
            
            // Update available states for the stored country
            const newStates = getStatesForCountry(address.country || 'Bangladesh');
            setAvailableStates(newStates);
          } catch (error) {
            console.error('Error loading stored address:', error);
          }
        }
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/account/addresses');
        if (response.ok) {
          const data = await response.json();
          const addressList = data.addresses || [];
          setAddresses(addressList);

          // Check for session storage first (current session preference)
          const storedAddressId = sessionStorage.getItem('selectedAddressId');
          let addressToUse = null;

          if (storedAddressId) {
            // Use the address from current session
            addressToUse = addressList.find((addr: Address) => addr.id === parseInt(storedAddressId));
          }
          
          // If no session storage or stored address not found, use default
          if (!addressToUse) {
            addressToUse = addressList.find((addr: Address) => addr.isDefault);
          }

          if (addressToUse) {
            setSelectedAddressId(addressToUse.id);
            populateFormFromAddress(addressToUse);
          }
        }
      } catch (error) {
        console.error('Error loading addresses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAddresses();
  }, [session]);


  // Populate form from selected address
  const populateFormFromAddress = (address: Address) => {
    setFormData({
      firstName: address.firstName || '',
      lastName: address.lastName || '',
      street1: address.street1 || '',
      street2: address.street2 || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postalCode || '',
      country: address.country || '',
      phone: address.phone || '',
    });

    // Update available states
    const newStates = getStatesForCountry(address.country || '');
    setAvailableStates(newStates);
  };

  // Handle address selection from dropdown
  const handleAddressSelect = (address: Address) => {
    setSelectedAddressId(address.id);
    populateFormFromAddress(address);
    
    // Store the selected address ID in session storage for current session persistence
    sessionStorage.setItem('selectedAddressId', address.id.toString());
  };

  // Handle country change
  const handleCountryChange = (countryName: string) => {
    const newStates = getStatesForCountry(countryName);
    setFormData({ 
      ...formData, 
      country: countryName, 
      state: '' 
    });
    setAvailableStates(newStates);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: any) => {
    setFormData({
      ...formData,
      street1: suggestion.street1 || formData.street1,
      street2: suggestion.street2 || formData.street2,
      city: suggestion.city || formData.city,
      state: suggestion.state || formData.state,
      postalCode: suggestion.postalCode || formData.postalCode,
      country: suggestion.country || formData.country,
    });
    
    // Update available states for the new country
    const newStates = getStatesForCountry(suggestion.country || formData.country);
    setAvailableStates(newStates);
  };

  // Handle form submission
  const handleContinueToPayment = () => {
    // Store the shipping information in sessionStorage for checkout page
    sessionStorage.setItem('shippingAddress', JSON.stringify(formData));
    router.push('/checkout');
  };

  // Auto-save form data to session storage for non-authenticated users
  useEffect(() => {
    if (!session?.user && formData.firstName) {
      // Only save if there's actual data (not just empty initial state)
      const hasData = formData.firstName || formData.lastName || formData.street1 || formData.city;
      if (hasData) {
        sessionStorage.setItem('shippingAddress', JSON.stringify(formData));
      }
    }
  }, [formData, session?.user]);

  // Redirect if cart is empty (but only after cart is initialized)
  useEffect(() => {
    if (isInitialized && state.cart.items.length === 0) {
      router.push('/cart');
    }
  }, [state.cart.items, router, isInitialized]);

  if (loading || status === 'loading' || !isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
          
          {/* Checkout Progress */}
          <nav className="flex items-center mt-4 text-sm">
            <button 
              onClick={() => router.push('/cart')}
              className="text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            >
              Cart
            </button>
            <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-2" />
            <span className="text-gray-900 font-medium">Information</span>
            <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-2" />
            <span className="text-gray-400">Payment</span>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Shipping Information */}
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Contact Information
              </h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={session?.user?.email || ''}
                  disabled
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Shipping Address
              </h2>
              
              {/* Saved Addresses Dropdown */}
              {addresses.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Use saved address
                  </label>
                  <select
                    value={selectedAddressId || ''}
                    onChange={(e) => {
                      const addressId = e.target.value ? parseInt(e.target.value) : null;
                      setSelectedAddressId(addressId);
                      
                      if (addressId) {
                        const address = addresses.find(a => a.id === addressId);
                        if (address) {
                          handleAddressSelect(address);
                        }
                      } else {
                        // User selected "Enter new address" - clear session storage and form
                        sessionStorage.removeItem('selectedAddressId');
                        setFormData({
                          firstName: '',
                          lastName: '',
                          street1: '',
                          street2: '',
                          city: '',
                          state: '',
                          postalCode: '',
                          country: 'Bangladesh'
                        });
                      }
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Enter new address</option>
                    {addresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.firstName} {address.lastName} - {address.street1}, {address.city}
                        {address.isDefault ? ' (Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Address Form */}
              <div className="space-y-4">
                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Address Lines */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    value={formData.street1}
                    onChange={(e) => setFormData({ ...formData, street1: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={formData.street2}
                    onChange={(e) => setFormData({ ...formData, street2: e.target.value })}
                    placeholder="Apartment, suite, unit, building, floor, etc."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Country and State */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country *
                    </label>
                    <select
                      value={formData.country}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Country</option>
                      {countries.map((country) => (
                        <option key={country.code} value={country.value}>
                          {country.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {hasStates && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State/Province *
                      </label>
                      <select
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Select State/Province</option>
                        {availableStates.map((state) => (
                          <option key={state.value} value={state.value}>
                            {state.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {!hasStates && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State/Province
                      </label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter state/province (optional)"
                      />
                    </div>
                  )}
                </div>

                {/* Postal Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zip/Postal Code *
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

              </div>
            </div>
          </div>

          {/* Right Side - Order Summary */}
          <div className="space-y-6">
            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Order Summary ({state.cart.itemCount} items)
              </h2>
              
              <div className="space-y-4 mb-6">
                {state.cart.items.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="relative flex-shrink-0">
                      <img
                        src={item.product.image}
                        alt={item.product.title}
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%23f3f4f6"/><text x="32" y="32" text-anchor="middle" dy=".3em" fill="%236b7280" font-family="Arial" font-size="10">Image</text></svg>`;
                        }}
                      />
                      <span className="absolute -top-2 -right-2 bg-gray-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {item.product.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {item.product.store}
                      </p>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatBdtPrice(item.product.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatBdtPrice(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service Charge</span>
                  <span className="font-medium">{formatBdtPrice(totals.serviceCharge)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping & Fees</span>
                  <span className="font-medium">{displayShipping(totals.shipping || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Estimated taxes</span>
                  <span className="font-medium">{formatBdtPrice(totals.tax || 0)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2">
                  <div className="flex justify-between">
                    <span className="text-base font-semibold">Total</span>
                    <span className="text-base font-bold">{formatBdtPrice(totals.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Continue to Payment Button */}
            <button
              onClick={handleContinueToPayment}
              disabled={!formData.firstName || !formData.lastName || !formData.street1 || !formData.city || !formData.country || !formData.postalCode || !formData.phone}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Payment
            </button>

            {/* Return to Cart */}
            <button
              onClick={() => router.push('/cart')}
              className="w-full text-blue-600 hover:text-blue-700 transition-colors cursor-pointer text-sm font-medium"
            >
              ← Return to cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}