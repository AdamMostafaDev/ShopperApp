'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState, useEffect } from 'react';
import { PlusIcon, MapPinIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/20/solid';
import countryList from 'react-select-country-list';
import worldCountries from 'world-countries';

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

interface EditAddressFormProps {
  address: Address;
  onSave: (address: Address) => void;
  onCancel: () => void;
  saving: boolean;
  setSaving: (saving: boolean) => void;
}

interface AddAddressFormProps {
  onSave: (address: Address) => void;
  onCancel: () => void;
  saving: boolean;
  setSaving: (saving: boolean) => void;
}

function EditAddressForm({ address, onSave, onCancel, saving, setSaving }: EditAddressFormProps) {
  const [formData, setFormData] = useState({
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

  // Country/State data - using react-select-country-list
  const countryData = countryList().getData();
  const countries = countryData.map(country => ({
    value: country.label,
    label: country.label,
    code: country.value
  }));

  // Get states for selected country using world-countries data
  const getStatesForCountry = (countryName: string) => {
    const country = worldCountries.find(c => 
      c.name.common === countryName || 
      c.name.official === countryName
    );
    
    if (!country) return [];
    
    // For US, Canada, Australia - countries with states/provinces
    const states = [];
    if (countryName === 'United States') {
      // US States
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
      // Canadian Provinces/Territories
      return [
        'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
        'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
        'Quebec', 'Saskatchewan', 'Yukon'
      ].map(province => ({ value: province, label: province }));
    } else if (countryName === 'Australia') {
      // Australian States/Territories
      return [
        'Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland',
        'South Australia', 'Tasmania', 'Victoria', 'Western Australia'
      ].map(state => ({ value: state, label: state }));
    }
    
    return [];
  };

  const [availableStates, setAvailableStates] = useState(getStatesForCountry(formData.country));
  const hasStates = availableStates.length > 0;

  const handleCountryChange = (countryName: string) => {
    const newStates = getStatesForCountry(countryName);
    setFormData({ 
      ...formData, 
      country: countryName, 
      state: '' // Clear state when country changes
    });
    setAvailableStates(newStates);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/account/addresses/${address.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        onSave(result.address);
      } else {
        console.error('Failed to update address');
      }
    } catch (error) {
      console.error('Error updating address:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

function AddAddressForm({ onSave, onCancel, saving, setSaving }: AddAddressFormProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    street1: '',
    street2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phone: '',
    isDefault: false,
  });

  // Country/State data - using react-select-country-list
  const countryData = countryList().getData();
  const countries = countryData.map(country => ({
    value: country.label,
    label: country.label,
    code: country.value
  }));

  // Get states for selected country
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

  const handleCountryChange = (countryName: string) => {
    const newStates = getStatesForCountry(countryName);
    setFormData({ 
      ...formData, 
      country: countryName, 
      state: '' // Clear state when country changes
    });
    setAvailableStates(newStates);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/account/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        onSave(result.address);
      } else {
        console.error('Failed to create address');
      }
    } catch (error) {
      console.error('Error creating address:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      {/* Default Address Checkbox */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isDefault"
          checked={formData.isDefault}
          onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="isDefault" className="text-sm text-gray-700">
          Set as default address
        </label>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Add Address'}
        </button>
      </div>
    </form>
  );
}

export default function AddressesPage() {
  const { data: session, status } = useSession();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingAddress, setDeletingAddress] = useState<Address | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [errorModal, setErrorModal] = useState<{show: boolean; message: string}>({show: false, message: ''});

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/account/addresses');
        if (response.ok) {
          const data = await response.json();
          setAddresses(data.addresses || []);
        } else {
          console.error('Failed to load addresses');
        }
      } catch (error) {
        console.error('Error loading addresses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAddresses();
  }, [session]);

  const handleDeleteAddress = async (address: Address) => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/account/addresses/${address.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAddresses(addresses.filter(addr => addr.id !== address.id));
        setDeletingAddress(null);
      } else {
        const data = await response.json();
        console.error('Failed to delete address:', data.error);
        setErrorModal({show: true, message: data.error});
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      setErrorModal({show: true, message: 'An error occurred while deleting the address'});
    } finally {
      setDeleting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    redirect('/signin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Shipping Addresses</h1>
        <p className="text-gray-600 mt-2">Manage your delivery addresses for faster checkout</p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Addresses List */}
      {!loading && (
        <div className="space-y-6">
          {/* Add New Address Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 hover:bg-gray-50 transition-colors group"
              >
                <PlusIcon className="mx-auto h-12 w-12 text-gray-400 group-hover:text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Add New Address</h3>
                <p className="text-gray-500">Add a shipping address for faster checkout</p>
              </button>
            </div>
          </div>

          {/* Existing Addresses */}
          {addresses.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {addresses.map((address, index) => (
                <div 
                  key={address.id} 
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      <h3 className="text-sm font-medium text-gray-900">Address #{index + 1}</h3>
                      {address.isDefault && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircleIcon className="w-3 h-3 mr-1" />
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => setEditingAddress(address)}
                        className="p-2.5 md:p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDeletingAddress(address)}
                        className="p-2.5 md:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    {(address.firstName || address.lastName) && (
                      <p className="font-medium text-gray-900 text-sm">
                        {address.firstName} {address.lastName}
                      </p>
                    )}
                    {address.street1 && <p>{address.street1}</p>}
                    {address.street2 && <p>{address.street2}</p>}
                    {(address.city || address.state || address.postalCode) && (
                      <p>
                        {address.city}
                        {address.state && `, ${address.state}`} {address.postalCode}
                      </p>
                    )}
                    <p>{address.country}</p>
                    {address.phone && <p className="text-xs text-gray-500">{address.phone}</p>}
                  </div>
                  
                  {!address.isDefault && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                        Set as Default
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {addresses.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <MapPinIcon className="mx-auto h-16 w-16 text-gray-300 mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No addresses yet
              </h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Add your first shipping address to make checkout faster and easier. You can add multiple addresses and set a default one.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Your First Address
              </button>
            </div>
          )}

          {/* Edit Address Modal/Form */}
          {editingAddress && (
            <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Edit Address</h2>
                    <button
                      onClick={() => setEditingAddress(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <EditAddressForm 
                    address={editingAddress}
                    onSave={(updatedAddress) => {
                      setAddresses(addresses.map(addr => 
                        addr.id === updatedAddress.id ? updatedAddress : addr
                      ));
                      setEditingAddress(null);
                    }}
                    onCancel={() => setEditingAddress(null)}
                    saving={saving}
                    setSaving={setSaving}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Add Address Modal/Form */}
          {showAddForm && (
            <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Add New Address</h2>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <AddAddressForm 
                    onSave={(newAddress) => {
                      setAddresses([newAddress, ...addresses]);
                      setShowAddForm(false);
                    }}
                    onCancel={() => setShowAddForm(false)}
                    saving={saving}
                    setSaving={setSaving}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          {deletingAddress && (
            <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <TrashIcon className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">Delete Address</h3>
                      <p className="text-sm text-gray-500">This action cannot be undone</p>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <p className="text-gray-700">
                      Are you sure you want to delete this address?
                    </p>
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                      {(deletingAddress.firstName || deletingAddress.lastName) && (
                        <div className="font-medium text-gray-900">
                          {deletingAddress.firstName} {deletingAddress.lastName}
                        </div>
                      )}
                      {deletingAddress.street1 && <div>{deletingAddress.street1}</div>}
                      {deletingAddress.street2 && <div>{deletingAddress.street2}</div>}
                      <div>
                        {deletingAddress.city}
                        {deletingAddress.state && `, ${deletingAddress.state}`} {deletingAddress.postalCode}
                      </div>
                      <div>{deletingAddress.country}</div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setDeletingAddress(null)}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(deletingAddress)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting...' : 'Delete Address'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Modal */}
          {errorModal.show && (
            <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">Unable to Delete Address</h3>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <p className="text-gray-700">{errorModal.message}</p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setErrorModal({show: false, message: ''})}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}