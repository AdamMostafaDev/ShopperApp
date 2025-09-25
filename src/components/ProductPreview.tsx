'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Product } from '@/types';
import { formatBdtPrice } from '@/lib/currency';
import { useCart } from '@/lib/cart-context';
import {
  PencilIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface ProductPreviewProps {
  product: Product;
  onApprove: (product: Product) => void;
  onReject: (productId: string) => void;
}

export default function ProductPreview({ product, onApprove, onReject }: ProductPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState<Product>(product);
  const [isLoading, setIsLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { addToCart } = useCart();

  const handleEdit = (field: keyof Product, value: any) => {
    setEditedProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEdit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/update-product', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: editedProduct.id,
          updates: {
            title: editedProduct.title,
            price: editedProduct.price,
            originalCurrency: editedProduct.originalCurrency,
            originalPriceValue: editedProduct.originalPriceValue,
            image: editedProduct.image,
            url: editedProduct.url,
          }
        })
      });

      if (response.ok) {
        setShowEditModal(false);
        setIsEditing(false);
        const updatedProduct = { ...editedProduct };
        onApprove(updatedProduct);
      } else {
        throw new Error('Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      setEditedProduct(product);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveAndAddToCart = () => {
    addToCart(editedProduct, 1);
    onApprove(editedProduct);
  };

  return (
    <>
      {/* Compact Product Card - Similar to Amazon's design */}
      <div className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 p-4 border border-gray-100 group hover:-translate-y-1">
        <div className="aspect-square bg-gray-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
          <img
            src={editedProduct.image}
            alt={editedProduct.title}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.src = '/assets/images/generic-product.svg';
            }}
          />
          {/* Edit button overlay */}
          <button
            onClick={() => setShowEditModal(true)}
            className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            title="Edit Details"
          >
            <PencilIcon className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 text-sm">
          {editedProduct.title}
        </h3>

        {/* Missing Information Warning - Compact */}
        {editedProduct.missingFields.length > 0 && (
          <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mr-1 flex-shrink-0" />
              <span className="text-xs text-yellow-700">
                {editedProduct.missingFields.includes('price') ? 'Price' : 'Info'} missing
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col space-y-1">
            <span className="text-lg font-bold text-gray-900">
              {formatBdtPrice(editedProduct.price)}
            </span>
            {editedProduct.originalPriceValue && editedProduct.originalCurrency && (
              <span className="text-xs text-gray-500">
                ${editedProduct.originalPriceValue.toFixed(2)} {editedProduct.originalCurrency}
              </span>
            )}
          </div>
          <span className="text-xs bg-gradient-to-r from-orange-500 to-orange-600 text-white px-2 py-1 rounded-full uppercase font-medium">
            {editedProduct.storeName || 'OTHER'}
          </span>
        </div>

        <button
          onClick={handleApproveAndAddToCart}
          className="w-full py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all text-sm font-semibold transform hover:scale-105 shadow-md"
        >
          Approve & Add to Cart
        </button>

        {/* Reject button */}
        <button
          onClick={() => onReject(editedProduct.id)}
          className="w-full mt-2 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all text-sm font-medium"
        >
          Reject
        </button>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Product Details</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditedProduct(product);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Title</label>
                <textarea
                  value={editedProduct.title}
                  onChange={(e) => handleEdit('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Enter product title"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={editedProduct.originalPriceValue || 0}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      handleEdit('originalPriceValue', value);
                      const bdtPrice = Math.round(value * 120);
                      handleEdit('price', bdtPrice);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    step="0.01"
                  />
                  <select
                    value={editedProduct.originalCurrency || 'USD'}
                    onChange={(e) => handleEdit('originalCurrency', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                  </select>
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={editedProduct.image}
                  onChange={(e) => handleEdit('image', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Product URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product URL</label>
                <input
                  type="url"
                  value={editedProduct.url}
                  onChange={(e) => handleEdit('url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/product"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSaveEdit}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save & Approve'}
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditedProduct(product);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}