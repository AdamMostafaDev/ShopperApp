'use client';

import { useEffect, useState } from 'react';
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TruckIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  XMarkIcon,
  ShoppingBagIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { displayShipping, displayAmount, getDisplayAmounts, getUpdatedItemPrices } from '@/lib/display-utils';

interface ProductItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
  store: string;
  url: string;
  weight: number;
  originalPriceValue: number;
  originalCurrency: string;
}

interface Order {
  id: number;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  status: string;
  fulfillmentStatus: string;
  paymentStatus: string;
  workflow: {
    orderPlaced: string;
    paymentConfirmation: string;
    shippedToUs: string;
    shippedToBd: string;
    domesticFulfillment: string;
    delivered: string;
  };
  amounts: {
    totalBdt: number;
    totalUsd: number;
    formattedBdt: string;
    formattedUsd: string;
  };
  items: ProductItem[];
  itemCount: number;
  weight: number;
  dates: {
    created: Date;
    updated: Date;
    formattedCreated: string;
  };
  shippingAddress: any;
  stripePaymentIntentId: string;
  exchangeRate: number;

  // Original pricing fields
  productCostBdt: number;
  productCostUsd?: number;
  serviceChargeBdt: number;
  serviceChargeUsd?: number;
  shippingCostBdt: number;
  shippingCostUsd?: number;
  taxBdt: number;
  taxUsd?: number;
  totalAmountBdt: number;
  totalAmountUsd?: number;

  // Final pricing fields (after admin update)
  finalPricingUpdated?: boolean;
  finalProductCostBdt?: number;
  finalProductCostUsd?: number;
  finalServiceChargeBdt?: number;
  finalServiceChargeUsd?: number;
  finalShippingCostBdt?: number;
  finalShippingCostUsd?: number;
  finalShippingOnlyBdt?: number;
  finalShippingOnlyUsd?: number;
  finalAdditionalFeesBdt?: number;
  finalAdditionalFeesUsd?: number;
  feeDescription?: string;
  finalTaxBdt?: number;
  finalTaxUsd?: number;
  finalTotalAmountBdt?: number;
  finalTotalAmountUsd?: number;
  finalItems?: any;
}

interface OrdersResponse {
  success: boolean;
  data: {
    orders: Order[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [editingPricing, setEditingPricing] = useState<Set<number>>(new Set());
  const [editedPricing, setEditedPricing] = useState<{[orderId: number]: any}>({});
  const [savingPricing, setSavingPricing] = useState<Set<number>>(new Set());
  const [shippingExpanded, setShippingExpanded] = useState<Set<number>>(new Set());
  const [sendingEmail, setSendingEmail] = useState<Set<number>>(new Set());
  const [sendingUSFacilityEmail, setSendingUSFacilityEmail] = useState<Set<number>>(new Set());
  const [sendingInternationalShippingEmail, setSendingInternationalShippingEmail] = useState<Set<number>>(new Set());
  const [sendingBDWarehouseEmail, setSendingBDWarehouseEmail] = useState<Set<number>>(new Set());
  const [sendingChoiceEmail, setSendingChoiceEmail] = useState<Set<number>>(new Set());
  const [sendingPickupEmail, setSendingPickupEmail] = useState<Set<number>>(new Set());
  const [sendingDeliveryEmail, setSendingDeliveryEmail] = useState<Set<number>>(new Set());
  const [sendingFinalPickupEmail, setSendingFinalPickupEmail] = useState<Set<number>>(new Set());
  const [sendingFinalDeliveryEmail, setSendingFinalDeliveryEmail] = useState<Set<number>>(new Set());
  const [updatingStatus, setUpdatingStatus] = useState<Set<number>>(new Set());
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<{[orderId: number]: string}>({});
  const [selectedShippedToUsStatus, setSelectedShippedToUsStatus] = useState<{[orderId: number]: string}>({});
  const [selectedShippedToBdStatus, setSelectedShippedToBdStatus] = useState<{[orderId: number]: string}>({});
  const [selectedDomesticFulfillmentStatus, setSelectedDomesticFulfillmentStatus] = useState<{[orderId: number]: string}>({});
  const [selectedDeliveredStatus, setSelectedDeliveredStatus] = useState<{[orderId: number]: string}>({});
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        status: statusFilter,
        search: searchTerm
      });

      const response = await fetch(`/api/admin/orders?${params}`);
      if (response.ok) {
        const data: OrdersResponse = await response.json();
        setOrders(data.data.orders);
        setPagination(data.data.pagination);

        // Initialize selected payment and shipping statuses for each order
        const initialPaymentStatuses: {[key: number]: string} = {};
        const initialShippingToUsStatuses: {[key: number]: string} = {};
        const initialShippingToBdStatuses: {[key: number]: string} = {};
        const initialDomesticFulfillmentStatuses: {[key: number]: string} = {};
        const initialDeliveredStatuses: {[key: number]: string} = {};
        data.data.orders.forEach(order => {
          initialPaymentStatuses[order.id] = order.paymentStatus;
          initialShippingToUsStatuses[order.id] = order.workflow.shippedToUs;
          initialShippingToBdStatuses[order.id] = order.workflow.shippedToBd;
          initialDomesticFulfillmentStatuses[order.id] = order.workflow.domesticFulfillment;
          initialDeliveredStatuses[order.id] = order.workflow.delivered;
        });
        setSelectedPaymentStatus(initialPaymentStatuses);
        setSelectedShippedToUsStatus(initialShippingToUsStatuses);
        setSelectedShippedToBdStatus(initialShippingToBdStatuses);
        setSelectedDomesticFulfillmentStatus(initialDomesticFulfillmentStatuses);
        setSelectedDeliveredStatus(initialDeliveredStatuses);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [currentPage, statusFilter, searchTerm]);

  const toggleOrderExpansion = (orderId: number) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const toggleShippingExpansion = (orderId: number) => {
    const newExpanded = new Set(shippingExpanded);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setShippingExpanded(newExpanded);
  };

  const handleSendConfirmationEmail = async (orderId: number) => {
    // Immediately update state to show sending
    setSendingEmail(prev => new Set([...prev, orderId]));
    console.log('🔄 Starting email send for order:', orderId);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/send-confirmation-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache' // Prevent caching issues
        }
      });

      const result = await response.json();
      console.log('📧 Email API response:', result);

      if (result.success) {
        // Show success feedback for longer duration
        console.log('✅ Email sent successfully for order:', orderId, 'Event ID:', result.eventId);

        // Update local state instead of refreshing entire page
        if (result.previousStatus === 'PENDING' && result.newStatus === 'PROCESSING') {
          setOrders(prevOrders =>
            prevOrders.map(order =>
              order.id === orderId
                ? { ...order, paymentStatus: 'PROCESSING', workflow: { ...order.workflow, paymentConfirmation: 'PROCESSING' } }
                : order
            )
          );
          setSelectedPaymentStatus(prev => ({...prev, [orderId]: 'PROCESSING'}));
        }

        // Auto-update shipping status if payment was confirmed to PAID
        if (result.newStatus === 'PAID') {
          setOrders(prevOrders =>
            prevOrders.map(order =>
              order.id === orderId
                ? { ...order, workflow: { ...order.workflow, shippedToUs: 'PROCESSING' } }
                : order
            )
          );
          setSelectedShippedToUsStatus(prev => ({...prev, [orderId]: 'PROCESSING'}));
        }

        // Use a better notification system instead of alert
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
            ✅ ${result.message || 'Email sent successfully!'}
            <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Order: ${orderId} | ${result.previousStatus === 'PENDING' ? 'Status updated to PROCESSING' : ''}</div>
          </div>
        `;
        document.body.appendChild(notification);

        // Remove notification after 4 seconds
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 4000);

      } else {
        console.error('❌ Failed to send email:', result.error);

        // Show error notification
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
            ❌ Failed to send email: ${result.error}
          </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 6000);
      }
    } catch (error) {
      console.error('Error sending confirmation email:', error);

      // Show error notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
          ❌ Failed to send email. Please try again.
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Network or server error</div>
        </div>
      `;
      document.body.appendChild(notification);

      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 6000);
    } finally {
      // Always clear the sending state
      setSendingEmail(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
      console.log('🔄 Email sending process completed for order:', orderId);
    }
  };

  // Smart Email Action - Handles different email types based on payment status
  const handleSmartEmailAction = async (orderId: number, paymentStatus: string) => {
    console.log(`🎯 Smart email action for order ${orderId}, status: ${paymentStatus}`);

    if (paymentStatus === 'PENDING') {
      // Send confirmation email AND update status to PROCESSING
      console.log('📧 PENDING → Sending confirmation email + updating to PROCESSING');

      // First send the email
      await handleSendConfirmationEmail(orderId);

      // Then update status to PROCESSING (only if email was successful)
      // The email function already handles status update for PENDING orders

    } else if (paymentStatus === 'PROCESSING') {
      // Send processing update email (existing functionality)
      console.log('📧 PROCESSING → Sending processing update email');
      await handleSendConfirmationEmail(orderId);

    } else if (paymentStatus === 'PAID') {
      // Send payment completion confirmation email (new functionality)
      console.log('📧 PAID → Sending payment completion confirmation email');

      // Mark as sending email
      setSendingEmail(prev => new Set([...prev, orderId]));

      try {
        const response = await fetch(`/api/admin/orders/${orderId}/send-completion-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const result = await response.json();

        if (result.success) {
          console.log('✅ Payment completion email sent successfully');

          // Show success notification
          const notification = document.createElement('div');
          notification.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
              ✅ Payment completion email sent successfully!
              <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Order: ${orderId}</div>
            </div>
          `;
          document.body.appendChild(notification);

          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 4000);

        } else {
          console.error('❌ Failed to send completion email:', result.error);

          // Show error notification
          const notification = document.createElement('div');
          notification.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
              ❌ Failed to send completion email: ${result.error}
            </div>
          `;
          document.body.appendChild(notification);

          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 6000);
        }
      } catch (error) {
        console.error('Error sending completion email:', error);

        // Show error notification
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
            ❌ Failed to send completion email. Please try again.
          </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 6000);
      } finally {
        // Clear sending state
        setSendingEmail(prev => {
          const newSet = new Set(prev);
          newSet.delete(orderId);
          return newSet;
        });
      }
    } else if (paymentStatus === 'REFUNDED') {
      // Send refund notification email
      console.log('📧 REFUNDED → Sending refund notification email');

      // Mark as sending email
      setSendingEmail(prev => new Set([...prev, orderId]));

      try {
        const response = await fetch(`/api/admin/orders/${orderId}/send-refund-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const result = await response.json();

        if (result.success) {
          console.log('✅ Refund notification email sent successfully');

          // Show success notification
          const notification = document.createElement('div');
          notification.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
              ✅ Refund notification email sent successfully!
              <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Order: ${orderId}</div>
            </div>
          `;
          document.body.appendChild(notification);

          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 4000);

        } else {
          console.error('❌ Failed to send refund email:', result.error);

          // Show error notification
          const notification = document.createElement('div');
          notification.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
              ❌ Failed to send refund email: ${result.error}
            </div>
          `;
          document.body.appendChild(notification);

          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 6000);
        }
      } catch (error) {
        console.error('Error sending refund email:', error);

        // Show error notification
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
            ❌ Failed to send refund email. Please try again.
          </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 6000);
      } finally {
        // Clear sending state
        setSendingEmail(prev => {
          const newSet = new Set(prev);
          newSet.delete(orderId);
          return newSet;
        });
      }
    }
  };

  // Handle US Facility Email Action
  const handleUSFacilityEmailAction = async (orderId: number) => {
    console.log(`📦 Sending US facility arrival confirmation email for order ${orderId}`);

    // Mark as sending US facility email
    setSendingUSFacilityEmail(prev => new Set([...prev, orderId]));

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/send-us-facility-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ US facility arrival email sent successfully');

        // Show success notification
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
            ✅ US facility arrival email sent successfully!
            <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Order: ${orderId}</div>
          </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 4000);

      } else {
        console.error('❌ Failed to send US facility email:', result.error);

        // Show error notification
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
            ❌ Failed to send US facility email: ${result.error}
          </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 6000);
      }
    } catch (error) {
      console.error('Error sending US facility email:', error);

      // Show error notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
          ❌ Failed to send US facility email. Please try again.
        </div>
      `;
      document.body.appendChild(notification);

      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 6000);
    } finally {
      // Clear sending state
      setSendingUSFacilityEmail(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  // Handle International Shipping Email Action
  const handleInternationalShippingEmailAction = async (orderId: number) => {
    console.log(`✈️ Sending international shipping confirmation email for order ${orderId}`);

    // Mark as sending international shipping email
    setSendingInternationalShippingEmail(prev => new Set([...prev, orderId]));

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/send-international-shipping-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ International shipping email sent successfully');

        // Show success notification
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
            ✅ International shipping email sent successfully!
            <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Order: ${orderId}</div>
          </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 4000);

      } else {
        console.error('❌ Failed to send international shipping email:', result.error);

        // Show error notification
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
            ❌ Failed to send international shipping email: ${result.error}
          </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 6000);
      }
    } catch (error) {
      console.error('Error sending international shipping email:', error);

      // Show error notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
          ❌ Failed to send international shipping email. Please try again.
        </div>
      `;
      document.body.appendChild(notification);

      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 6000);
    } finally {
      // Clear sending state
      setSendingInternationalShippingEmail(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  // Handle BD Warehouse Email Action
  const handleBDWarehouseEmailAction = async (orderId: number) => {
    console.log(`🏢 Sending BD warehouse arrival confirmation email for order ${orderId}`);

    // Mark as sending BD warehouse email
    setSendingBDWarehouseEmail(prev => new Set([...prev, orderId]));

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/send-bd-warehouse-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ BD warehouse arrival email sent successfully');

        // Show success notification
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
            ✅ BD warehouse arrival email sent successfully!
            <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Order: ${orderId}</div>
          </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 4000);

      } else {
        console.error('❌ Failed to send BD warehouse email:', result.error);

        // Show error notification
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
            ❌ Failed to send BD warehouse email: ${result.error}
          </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 6000);
      }
    } catch (error) {
      console.error('Error sending BD warehouse email:', error);

      // Show error notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
          ❌ Failed to send BD warehouse email. Please try again.
        </div>
      `;
      document.body.appendChild(notification);

      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 6000);
    } finally {
      // Clear sending state
      setSendingBDWarehouseEmail(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  // Handle Domestic Fulfillment Email Actions
  const handleCustomerChoiceEmailAction = async (orderId: number) => {
    console.log(`📋 Sending customer choice email for order ${orderId}`);

    setSendingChoiceEmail(prev => new Set([...prev, orderId]));

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/send-choice-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Customer choice email sent successfully');

        // Show success notification
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
            ✅ Customer choice email sent successfully!
            <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Order: ${orderId}</div>
          </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 4000);

      } else {
        console.error('❌ Failed to send choice email:', result.error);

        // Show error notification
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
            ❌ Failed to send choice email: ${result.error}
          </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 6000);
      }
    } catch (error) {
      console.error('Error sending choice email:', error);

      // Show error notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
          ❌ Failed to send choice email. Please try again.
        </div>
      `;
      document.body.appendChild(notification);

      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 6000);
    } finally {
      setSendingChoiceEmail(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const handlePickupEmailAction = async (orderId: number) => {
    console.log(`🏪 Sending pickup confirmation email for order ${orderId}`);

    setSendingPickupEmail(prev => new Set([...prev, orderId]));

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/send-pickup-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Pickup confirmation email sent successfully');

        // Show success notification
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
            ✅ Pickup confirmation email sent successfully!
            <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Order: ${orderId}</div>
          </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 4000);

      } else {
        console.error('❌ Failed to send pickup email:', result.error);

        // Show error notification
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
            ❌ Failed to send pickup email: ${result.error}
          </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 6000);
      }
    } catch (error) {
      console.error('Error sending pickup email:', error);

      // Show error notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
          ❌ Failed to send pickup email. Please try again.
        </div>
      `;
      document.body.appendChild(notification);

      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 6000);
    } finally {
      setSendingPickupEmail(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const handleDeliveryEmailAction = async (orderId: number) => {
    console.log(`🚚 Sending delivery confirmation email for order ${orderId}`);

    setSendingDeliveryEmail(prev => new Set([...prev, orderId]));

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/send-delivery-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Delivery confirmation email sent successfully');

        // Show success notification
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
            ✅ Delivery confirmation email sent successfully!
            <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Order: ${orderId}</div>
          </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 4000);

      } else {
        console.error('❌ Failed to send delivery email:', result.error);

        // Show error notification
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
            ❌ Failed to send delivery email: ${result.error}
          </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 6000);
      }
    } catch (error) {
      console.error('Error sending delivery email:', error);

      // Show error notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
          ❌ Failed to send delivery email. Please try again.
        </div>
      `;
      document.body.appendChild(notification);

      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 6000);
    } finally {
      setSendingDeliveryEmail(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const handleFinalPickupEmailAction = async (orderId: number) => {
    console.log(`✅ Sending final pickup confirmation email for order ${orderId}`);

    setSendingFinalPickupEmail(prev => new Set([...prev, orderId]));

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/send-final-pickup-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      let result;
      try {
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        result = await response.json();
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('HTTP')) {
          throw e; // Re-throw HTTP errors
        }
        // This is a JSON parsing error
        throw new Error(`Failed to parse response as JSON: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to send final pickup confirmation email');
      }

      console.log(`✅ Final pickup confirmation email sent successfully for order ${orderId}`);

      // Show success notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="font-size: 18px;">✅</div>
            <div>Final pickup confirmation email sent successfully!</div>
          </div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Order: ${orderId} | Review request sent to customer</div>
        </div>
      `;
      document.body.appendChild(notification);

      // Auto-remove notification after 6 seconds
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 6000);

    } catch (error) {
      console.error('Error sending final pickup confirmation email:', error);

      // Show error notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="font-size: 18px;">❌</div>
            <div>Failed to send final pickup confirmation email</div>
          </div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">${error instanceof Error ? error.message : 'Unknown error'}</div>
        </div>
      `;
      document.body.appendChild(notification);

      // Auto-remove notification after 6 seconds
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 6000);
    } finally {
      setSendingFinalPickupEmail(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const handleFinalDeliveryEmailAction = async (orderId: number) => {
    console.log(`✅ Sending final delivery confirmation email for order ${orderId}`);

    setSendingFinalDeliveryEmail(prev => new Set([...prev, orderId]));

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/send-final-delivery-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      let result;
      try {
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        result = await response.json();
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('HTTP')) {
          throw e; // Re-throw HTTP errors
        }
        // This is a JSON parsing error
        throw new Error(`Failed to parse response as JSON: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to send final delivery confirmation email');
      }

      console.log(`✅ Final delivery confirmation email sent successfully for order ${orderId}`);

      // Show success notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="font-size: 18px;">✅</div>
            <div>Final delivery confirmation email sent successfully!</div>
          </div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Order: ${orderId} | Review request sent to customer</div>
        </div>
      `;
      document.body.appendChild(notification);

      // Auto-remove notification after 6 seconds
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 6000);

    } catch (error) {
      console.error('Error sending final delivery confirmation email:', error);

      // Show error notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="font-size: 18px;">❌</div>
            <div>Failed to send final delivery confirmation email</div>
          </div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">${error instanceof Error ? error.message : 'Unknown error'}</div>
        </div>
      `;
      document.body.appendChild(notification);

      // Auto-remove notification after 6 seconds
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 6000);
    } finally {
      setSendingFinalDeliveryEmail(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const handleStatusChange = async (orderId: number, statusType: 'paymentStatus' | 'shippedToUsStatus' | 'shippedToBdStatus' | 'domesticFulfillmentStatus' | 'deliveredStatus', value: string) => {
    setUpdatingStatus(prev => new Set([...prev, orderId]));

    // Update the local state immediately for better UX
    if (statusType === 'paymentStatus') {
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? {
                ...order,
                paymentStatus: value,
                workflow: {
                  ...order.workflow,
                  paymentConfirmation: value,
                  // Auto-update US shipping when payment confirmed
                  shippedToUs: value === 'PAID' ? 'PROCESSING' : order.workflow.shippedToUs
                }
              }
            : order
        )
      );

      // Also update the selected shipping status state if payment becomes PAID
      if (value === 'PAID') {
        setSelectedShippedToUsStatus(prev => ({...prev, [orderId]: 'PROCESSING'}));
      }
    } else if (statusType === 'shippedToUsStatus') {
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, workflow: { ...order.workflow, shippedToUs: value } }
            : order
        )
      );
    } else if (statusType === 'shippedToBdStatus') {
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? {
                ...order,
                workflow: {
                  ...order.workflow,
                  shippedToBd: value,
                  // Auto-update domestic fulfillment when BD warehouse complete
                  domesticFulfillment: value === 'COMPLETE' ? 'PROCESSING' : order.workflow.domesticFulfillment
                }
              }
            : order
        )
      );

      // Also update the selected domestic fulfillment status if BD warehouse becomes COMPLETE
      if (value === 'COMPLETE') {
        setSelectedDomesticFulfillmentStatus(prev => ({...prev, [orderId]: 'PROCESSING'}));
      }
    } else if (statusType === 'domesticFulfillmentStatus') {
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, workflow: { ...order.workflow, domesticFulfillment: value } }
            : order
        )
      );
    } else if (statusType === 'deliveredStatus') {
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, workflow: { ...order.workflow, delivered: value } }
            : order
        )
      );
    }

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ statusType, value })
      });

      if (response.ok) {
        const updatedOrder = await response.json();

        // Update just this specific order in the state
        if (statusType === 'paymentStatus') {
          setOrders(prevOrders =>
            prevOrders.map(order =>
              order.id === orderId
                ? {
                    ...order,
                    paymentStatus: value,
                    workflow: {
                      ...order.workflow,
                      paymentConfirmation: value,
                      // Auto-update US shipping when payment confirmed
                      shippedToUs: value === 'PAID' ? 'PROCESSING' : order.workflow.shippedToUs
                    }
                  }
                : order
            )
          );

          // Also update the selected shipping status state if payment becomes PAID
          if (value === 'PAID') {
            setSelectedShippedToUsStatus(prev => ({...prev, [orderId]: 'PROCESSING'}));
          }
        } else if (statusType === 'shippedToUsStatus') {
          setOrders(prevOrders =>
            prevOrders.map(order =>
              order.id === orderId
                ? { ...order, workflow: { ...order.workflow, shippedToUs: value } }
                : order
            )
          );
        } else if (statusType === 'shippedToBdStatus') {
          setOrders(prevOrders =>
            prevOrders.map(order =>
              order.id === orderId
                ? {
                    ...order,
                    workflow: {
                      ...order.workflow,
                      shippedToBd: value,
                      // Auto-update domestic fulfillment when BD warehouse complete
                      domesticFulfillment: value === 'COMPLETE' ? 'PROCESSING' : order.workflow.domesticFulfillment
                    }
                  }
                : order
            )
          );

          // Also update the selected domestic fulfillment status if BD warehouse becomes COMPLETE
          if (value === 'COMPLETE') {
            setSelectedDomesticFulfillmentStatus(prev => ({...prev, [orderId]: 'PROCESSING'}));
          }
        } else if (statusType === 'domesticFulfillmentStatus') {
          setOrders(prevOrders =>
            prevOrders.map(order =>
              order.id === orderId
                ? { ...order, workflow: { ...order.workflow, domesticFulfillment: value } }
                : order
            )
          );
        } else if (statusType === 'deliveredStatus') {
          setOrders(prevOrders =>
            prevOrders.map(order =>
              order.id === orderId
                ? { ...order, workflow: { ...order.workflow, delivered: value } }
                : order
            )
          );
        }

        console.log(`✅ Updated ${statusType} to ${value} for order ${orderId}`);

        // Show success notification
        const notification = document.createElement('div');
        const autoShippingMessage = (statusType === 'paymentStatus' && value === 'PAID')
          ? '<div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">🚚 US shipping status auto-updated to PROCESSING</div>'
          : (statusType === 'shippedToBdStatus' && value === 'COMPLETE')
          ? '<div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">📦 Domestic fulfillment auto-updated to PROCESSING</div>'
          : '';

        notification.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
            ✅ Status updated successfully!
            ${autoShippingMessage}
          </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      } else {
        // Revert the optimistic update if the request failed
        fetchOrders();
        console.error('❌ Failed to update status');
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;">
            ❌ Failed to update status
          </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      }
    } catch (error) {
      // Revert the optimistic update on error
      fetchOrders();
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'bg-green-100 text-green-800 border-green-200';
      case 'SHIPPED': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PROCESSING': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      case 'COMPLETE': return 'bg-green-100 text-green-800 border-green-200';
      case 'PICKUP': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'DELIVERY': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'PICKUP_COMPLETE': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'DELIVERY_COMPLETE': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'PAID': return 'bg-green-100 text-green-800 border-green-200';
      case 'FAILED': return 'bg-red-100 text-red-800 border-red-200';
      case 'REFUNDED': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SUCCEEDED': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETE':
      case 'SUCCEEDED':
      case 'DELIVERED':
      case 'PAID':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'PENDING':
      case 'PROCESSING':
        return <ClockIcon className="h-4 w-4" />;
      case 'FAILED':
      case 'CANCELLED':
        return <XCircleIcon className="h-4 w-4" />;
      case 'SHIPPED':
        return <TruckIcon className="h-4 w-4" />;
      case 'REFUNDED':
        return <XCircleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management - Full Details</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders, customers, products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <div className="flex items-center text-sm text-gray-600">
            Showing {orders.length} of {pagination.total} orders
          </div>
        </div>
      </div>

      {/* Orders List with Expandable Details */}
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white shadow-sm rounded-lg border overflow-hidden">
            {/* Order Header - Always Visible */}
            <div
              className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleOrderExpansion(order.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Order Info */}
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Order</p>
                    <p className="text-sm font-semibold text-gray-900">#{order.orderNumber}</p>
                    <p className="text-xs text-gray-500 mt-1">{order.dates.formattedCreated}</p>
                  </div>

                  {/* Customer */}
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Customer</p>
                    <p className="text-sm font-medium text-gray-900">{order.customer.name}</p>
                    <p className="text-xs text-gray-500">{order.customer.email}</p>
                  </div>

                  {/* Amount */}
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                    <p className="text-sm font-semibold text-gray-900">{order.amounts.formattedBdt}</p>
                    <p className="text-xs text-gray-500">{order.amounts.formattedUsd}</p>
                  </div>

                  {/* Status */}
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </span>
                  </div>

                  {/* Items Count */}
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Items</p>
                    <p className="text-sm font-medium text-gray-900">{order.itemCount} products</p>
                    <p className="text-xs text-gray-500">{order.weight}kg total</p>
                  </div>
                </div>

                {/* Expand/Collapse Icon */}
                <div className="ml-4">
                  {expandedOrders.has(order.id) ? (
                    <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedOrders.has(order.id) && (
              <div className="border-t bg-gray-50">
                {/* All Status Details */}
                <div className="p-6 border-b">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Complete Status Information</h3>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Column 1: Order Statuses */}
                    <div className="lg:col-span-3 space-y-3">
                      <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Order Statuses</h4>
                      <div className="space-y-2">
                        <div className="flex flex-col space-y-1">
                          <span className="text-xs text-gray-500">Order Status:</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)} w-fit`}>
                            {getStatusIcon(order.status)}
                            {order.status}
                          </span>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <span className="text-xs text-gray-500">Fulfillment:</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getStatusColor(order.fulfillmentStatus)} w-fit`}>
                            {order.fulfillmentStatus}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: International Shipping Workflow */}
                    <div className="lg:col-span-6 space-y-3">
                      <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">International Shipping Workflow</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600 min-w-[180px]">Order Placed:</span>
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(order.workflow.orderPlaced)}`}>
                            {order.workflow.orderPlaced}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600 min-w-[180px]">Payment:</span>
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedPaymentStatus[order.id] || order.paymentStatus}
                              onChange={(e) => {
                                const newStatus = e.target.value;
                                setSelectedPaymentStatus(prev => ({...prev, [order.id]: newStatus}));
                                handleStatusChange(order.id, 'paymentStatus', newStatus);
                              }}
                              disabled={updatingStatus.has(order.id)}
                              className={`text-xs font-semibold rounded px-2 py-1 border ${getStatusColor(selectedPaymentStatus[order.id] || order.paymentStatus)} cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${updatingStatus.has(order.id) ? 'opacity-50' : ''} relative w-40`}
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="PROCESSING">PROCESSING</option>
                              <option value="PAID">PAID</option>
                              <option value="FAILED">FAILED</option>
                              <option value="REFUNDED">REFUNDED</option>
                            </select>
                            {/* Smart Email Button - Updates based on selected status */}
                            {(() => {
                              const currentStatus = selectedPaymentStatus[order.id] || order.paymentStatus;
                              return (currentStatus === 'PENDING' || currentStatus === 'PAID' || currentStatus === 'REFUNDED') && (
                                <button
                                  onClick={() => handleSmartEmailAction(order.id, currentStatus)}
                                  disabled={sendingEmail.has(order.id)}
                                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                  title={
                                    currentStatus === 'PENDING'
                                      ? 'Send price confirmation email and auto-update status to PROCESSING'
                                      : currentStatus === 'PAID'
                                      ? 'Send payment confirmation email to customer'
                                      : 'Send refund notification email to customer'
                                  }
                                >
                                  {sendingEmail.has(order.id) ? (
                                    <>
                                      <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      <span>Sending...</span>
                                    </>
                                  ) : (
                                    <>
                                      <EnvelopeIcon className="h-3 w-3" />
                                      <span>
                                        {currentStatus === 'PENDING'
                                          ? 'Send Price Confirmation'
                                          : currentStatus === 'PAID'
                                          ? 'Send Payment Confirmation'
                                          : 'Send Refund Notification'}
                                      </span>
                                    </>
                                  )}
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600 min-w-[180px]">Shipped to US Facility:</span>
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedShippedToUsStatus[order.id] || order.workflow.shippedToUs}
                              onChange={(e) => {
                                const newStatus = e.target.value;
                                setSelectedShippedToUsStatus(prev => ({...prev, [order.id]: newStatus}));
                                handleStatusChange(order.id, 'shippedToUsStatus', newStatus);
                              }}
                              disabled={updatingStatus.has(order.id)}
                              className={`text-xs font-semibold rounded px-2 py-1 border ${getStatusColor(selectedShippedToUsStatus[order.id] || order.workflow.shippedToUs)} cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${updatingStatus.has(order.id) ? 'opacity-50' : ''} relative w-40`}
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="PROCESSING">PROCESSING</option>
                              <option value="COMPLETE">COMPLETE</option>
                            </select>
                            {/* Smart Email Button for US Facility */}
                            {(() => {
                              const currentStatus = selectedShippedToUsStatus[order.id] || order.workflow.shippedToUs;
                              return currentStatus === 'COMPLETE' && (
                                <button
                                  onClick={() => handleUSFacilityEmailAction(order.id)}
                                  disabled={sendingUSFacilityEmail.has(order.id)}
                                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                  title="Send US facility arrival confirmation email to customer"
                                >
                                  {sendingUSFacilityEmail.has(order.id) ? (
                                    <>
                                      <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      <span>Sending...</span>
                                    </>
                                  ) : (
                                    <>
                                      <EnvelopeIcon className="h-3 w-3" />
                                      <span>Send US Arrival Confirmation</span>
                                    </>
                                  )}
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600 min-w-[180px]">Shipped Internationally:</span>
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedShippedToBdStatus[order.id] || order.workflow.shippedToBd}
                              onChange={(e) => {
                                const newStatus = e.target.value;
                                setSelectedShippedToBdStatus(prev => ({...prev, [order.id]: newStatus}));
                                handleStatusChange(order.id, 'shippedToBdStatus', newStatus);
                              }}
                              disabled={updatingStatus.has(order.id)}
                              className={`text-xs font-semibold rounded px-2 py-1 border ${getStatusColor(selectedShippedToBdStatus[order.id] || order.workflow.shippedToBd)} cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${updatingStatus.has(order.id) ? 'opacity-50' : ''} relative w-40`}
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="PROCESSING">PROCESSING</option>
                              <option value="COMPLETE">COMPLETE</option>
                            </select>
                            {/* Smart Email Button for International Shipping */}
                            {(() => {
                              const currentStatus = selectedShippedToBdStatus[order.id] || order.workflow.shippedToBd;
                              return (currentStatus === 'PROCESSING' || currentStatus === 'COMPLETE') && (
                                <button
                                  onClick={() => {
                                    if (currentStatus === 'PROCESSING') {
                                      handleInternationalShippingEmailAction(order.id);
                                    } else if (currentStatus === 'COMPLETE') {
                                      handleBDWarehouseEmailAction(order.id);
                                    }
                                  }}
                                  disabled={sendingInternationalShippingEmail.has(order.id) || sendingBDWarehouseEmail.has(order.id)}
                                  className={`px-3 py-1 text-sm ${currentStatus === 'PROCESSING' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-orange-600 hover:bg-orange-700'} text-white rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1`}
                                  title={
                                    currentStatus === 'PROCESSING'
                                      ? 'Send international shipping confirmation email to customer'
                                      : 'Send BD warehouse arrival confirmation email to customer'
                                  }
                                >
                                  {(sendingInternationalShippingEmail.has(order.id) || sendingBDWarehouseEmail.has(order.id)) ? (
                                    <>
                                      <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      <span>Sending...</span>
                                    </>
                                  ) : (
                                    <>
                                      <EnvelopeIcon className="h-3 w-3" />
                                      <span>
                                        {currentStatus === 'PROCESSING'
                                          ? 'Send Shipping Confirmation'
                                          : 'Send BD Arrival Confirmation'}
                                      </span>
                                    </>
                                  )}
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600 min-w-[180px]">Domestic Fulfillment:</span>
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedDomesticFulfillmentStatus[order.id] || order.workflow.domesticFulfillment}
                              onChange={(e) => {
                                const newStatus = e.target.value;
                                setSelectedDomesticFulfillmentStatus(prev => ({...prev, [order.id]: newStatus}));
                                handleStatusChange(order.id, 'domesticFulfillmentStatus', newStatus);
                              }}
                              disabled={updatingStatus.has(order.id)}
                              className={`text-xs font-semibold rounded px-2 py-1 border ${getStatusColor(selectedDomesticFulfillmentStatus[order.id] || order.workflow.domesticFulfillment)} cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${updatingStatus.has(order.id) ? 'opacity-50' : ''} relative w-40`}
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="PROCESSING">PROCESSING</option>
                              <option value="PICKUP">PICKUP</option>
                              <option value="DELIVERY">DELIVERY</option>
                            </select>
                            {/* Smart Email Buttons for Domestic Fulfillment */}
                            {(() => {
                              const currentStatus = selectedDomesticFulfillmentStatus[order.id] || order.workflow.domesticFulfillment;
                              if (currentStatus === 'PROCESSING') {
                                return (
                                  <button
                                    onClick={() => handleCustomerChoiceEmailAction(order.id)}
                                    disabled={sendingChoiceEmail.has(order.id)}
                                    className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                    title="Send customer choice email (pickup or delivery)"
                                  >
                                    {sendingChoiceEmail.has(order.id) ? (
                                      <>
                                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Sending...</span>
                                      </>
                                    ) : (
                                      <>
                                        <EnvelopeIcon className="h-3 w-3" />
                                        <span>Send Delivery Options</span>
                                      </>
                                    )}
                                  </button>
                                );
                              } else if (currentStatus === 'PICKUP') {
                                return (
                                  <button
                                    onClick={() => handlePickupEmailAction(order.id)}
                                    disabled={sendingPickupEmail.has(order.id)}
                                    className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                    title="Send pickup confirmation email to customer"
                                  >
                                    {sendingPickupEmail.has(order.id) ? (
                                      <>
                                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Sending...</span>
                                      </>
                                    ) : (
                                      <>
                                        <EnvelopeIcon className="h-3 w-3" />
                                        <span>Send Pickup Confirmation</span>
                                      </>
                                    )}
                                  </button>
                                );
                              } else if (currentStatus === 'DELIVERY') {
                                return (
                                  <button
                                    onClick={() => handleDeliveryEmailAction(order.id)}
                                    disabled={sendingDeliveryEmail.has(order.id)}
                                    className="px-3 py-1 text-sm bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                    title="Send delivery confirmation email to customer"
                                  >
                                    {sendingDeliveryEmail.has(order.id) ? (
                                      <>
                                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Sending...</span>
                                      </>
                                    ) : (
                                      <>
                                        <EnvelopeIcon className="h-3 w-3" />
                                        <span>Send Delivery Confirmation</span>
                                      </>
                                    )}
                                  </button>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600 min-w-[180px]">Delivered:</span>
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedDeliveredStatus[order.id] || order.workflow.delivered}
                              onChange={(e) => {
                                const newStatus = e.target.value;
                                setSelectedDeliveredStatus(prev => ({...prev, [order.id]: newStatus}));
                                handleStatusChange(order.id, 'deliveredStatus', newStatus);
                              }}
                              disabled={updatingStatus.has(order.id)}
                              className={`text-xs font-semibold rounded px-2 py-1 border ${getStatusColor(selectedDeliveredStatus[order.id] || order.workflow.delivered)} cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${updatingStatus.has(order.id) ? 'opacity-50' : ''} relative w-40`}
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="PROCESSING">PROCESSING</option>
                              <option value="PICKUP_COMPLETE">PICKUP COMPLETE</option>
                              <option value="DELIVERY_COMPLETE">DELIVERY COMPLETE</option>
                            </select>
                            {/* Final Pickup Confirmation Button - Now inline with more space */}
                            {(() => {
                              const currentDeliveredStatus = selectedDeliveredStatus[order.id] || order.workflow.delivered;
                              if (currentDeliveredStatus === 'PICKUP_COMPLETE') {
                                return (
                                  <button
                                    onClick={() => handleFinalPickupEmailAction(order.id)}
                                    disabled={sendingFinalPickupEmail.has(order.id)}
                                    className="px-3 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                    title="Send final pickup confirmation with review request"
                                  >
                                    {sendingFinalPickupEmail.has(order.id) ? (
                                      <>
                                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Sending...</span>
                                      </>
                                    ) : (
                                      <>
                                        <EnvelopeIcon className="h-3 w-3" />
                                        <span>Send Final Pickup Confirmation</span>
                                      </>
                                    )}
                                  </button>
                                );
                              }

                              if (currentDeliveredStatus === 'DELIVERY_COMPLETE') {
                                return (
                                  <button
                                    onClick={() => handleFinalDeliveryEmailAction(order.id)}
                                    disabled={sendingFinalDeliveryEmail.has(order.id)}
                                    className="px-3 py-1 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                    title="Send final delivery confirmation with review request"
                                  >
                                    {sendingFinalDeliveryEmail.has(order.id) ? (
                                      <>
                                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Sending...</span>
                                      </>
                                    ) : (
                                      <>
                                        <EnvelopeIcon className="h-3 w-3" />
                                        <span>Send Final Delivery Confirmation</span>
                                      </>
                                    )}
                                  </button>
                                );
                              }

                              return null;
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Additional Information */}
                    <div className="lg:col-span-3 space-y-3">
                      <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Additional Information</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-gray-500">Stripe Payment ID:</span>
                          <p className="text-xs font-mono text-gray-700 break-all">
                            {order.stripePaymentIntentId || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Exchange Rate:</span>
                          <p className="text-sm text-gray-700">1 USD = {order.exchangeRate} BDT</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Customer Phone:</span>
                          <p className="text-sm text-gray-700">{order.customer.phone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing Breakdown Section with Inline Editing */}
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">Pricing Breakdown</h3>
                    {!editingPricing.has(order.id) ? (
                      <button
                        onClick={() => {
                          setEditingPricing(new Set([...editingPricing, order.id]));
                          setEditedPricing({
                            ...editedPricing,
                            [order.id]: {
                              exchangeRate: order.exchangeRate || 121.5,
                              finalShippingOnlyBdt: order.finalShippingOnlyBdt || order.finalShippingCostBdt || order.shippingCostBdt || 0,
                              finalAdditionalFeesBdt: order.finalAdditionalFeesBdt || 0,
                              feeDescription: order.feeDescription || '',
                              finalShippingCostBdt: order.finalShippingCostBdt || order.shippingCostBdt || 0,
                              finalTaxBdt: order.finalTaxBdt || order.taxBdt || 0,
                              finalItems: order.items.map((item: any, index: number) => {
                                // Check if there's an existing finalItem for this item
                                const existingFinalItem = order.finalItems?.find((fItem: any) =>
                                  fItem.id === (item.id || item.product?.id)
                                ) || order.finalItems?.[index];

                                return {
                                  id: item.id || item.product?.id,
                                  quantity: item.quantity,
                                  finalPriceBdt: existingFinalItem?.finalPriceBdt || item.price || 0,
                                };
                              })
                            }
                          });
                        }}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Edit Pricing
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const pricing = editedPricing[order.id];
                            if (!pricing) return;

                            setSavingPricing(new Set([...savingPricing, order.id]));

                            // Calculate total product cost from individual items
                            const finalProductCostBdt = pricing.finalItems.reduce((sum: number, item: any) =>
                              sum + (item.finalPriceBdt * item.quantity), 0);

                            // Calculate shipping total from breakdown
                            const finalShippingCostBdt = (pricing.finalShippingOnlyBdt || 0) + (pricing.finalAdditionalFeesBdt || 0);

                            // Calculate derived values
                            const finalServiceChargeBdt = Math.round(finalProductCostBdt * 0.05);
                            const finalTaxBdt = pricing.finalTaxBdt || 0;  // Use custom tax value
                            const finalTotalAmountBdt = finalProductCostBdt + finalServiceChargeBdt + finalShippingCostBdt + finalTaxBdt;

                            // USD equivalents
                            const finalProductCostUsd = Math.round((finalProductCostBdt / pricing.exchangeRate) * 100) / 100;
                            const finalServiceChargeUsd = Math.round((finalServiceChargeBdt / pricing.exchangeRate) * 100) / 100;
                            const finalShippingCostUsd = Math.round((finalShippingCostBdt / pricing.exchangeRate) * 100) / 100;
                            const finalShippingOnlyUsd = Math.round((pricing.finalShippingOnlyBdt / pricing.exchangeRate) * 100) / 100;
                            const finalAdditionalFeesUsd = Math.round((pricing.finalAdditionalFeesBdt / pricing.exchangeRate) * 100) / 100;
                            const finalTaxUsd = Math.round((finalTaxBdt / pricing.exchangeRate) * 100) / 100;
                            const finalTotalAmountUsd = Math.round((finalTotalAmountBdt / pricing.exchangeRate) * 100) / 100;

                            try {
                              const response = await fetch(`/api/admin/orders/${order.id}/update-pricing`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  exchangeRate: pricing.exchangeRate,
                                  finalProductCostBdt,
                                  finalServiceChargeBdt,
                                  finalShippingCostBdt,
                                  finalShippingOnlyBdt: pricing.finalShippingOnlyBdt,
                                  finalShippingOnlyUsd,
                                  finalAdditionalFeesBdt: pricing.finalAdditionalFeesBdt,
                                  finalAdditionalFeesUsd,
                                  feeDescription: pricing.feeDescription,
                                  finalTaxBdt,
                                  finalTotalAmountBdt,
                                  finalProductCostUsd,
                                  finalServiceChargeUsd,
                                  finalShippingCostUsd,
                                  finalTaxUsd,
                                  finalTotalAmountUsd,
                                  finalItems: pricing.finalItems,
                                }),
                              });

                              if (response.ok) {
                                fetchOrders();
                                setEditingPricing(new Set([...editingPricing].filter(id => id !== order.id)));
                              }
                            } catch (error) {
                              console.error('Error updating pricing:', error);
                            } finally {
                              setSavingPricing(new Set([...savingPricing].filter(id => id !== order.id)));
                            }
                          }}
                          disabled={savingPricing.has(order.id)}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {savingPricing.has(order.id) ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingPricing(new Set([...editingPricing].filter(id => id !== order.id)));
                            const newEditedPricing = { ...editedPricing };
                            delete newEditedPricing[order.id];
                            setEditedPricing(newEditedPricing);
                          }}
                          className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {(() => {
                    const amounts = getDisplayAmounts(order);
                    const isEditing = editingPricing.has(order.id);
                    const edited = editedPricing[order.id] || {};

                    // Calculate derived values for display
                    const displayProductCost = isEditing ?
                      edited.finalItems?.reduce((sum: number, item: any) => sum + (item.finalPriceBdt * item.quantity), 0) || 0
                      : amounts.productCostBdt;
                    const displayShippingCost = isEditing ?
                      ((edited.finalShippingOnlyBdt || 0) + (edited.finalAdditionalFeesBdt || 0))
                      : amounts.shippingCostBdt;
                    const displayExchangeRate = isEditing ? edited.exchangeRate : (order.exchangeRate || 121.5);
                    const displayServiceCharge = Math.round(displayProductCost * 0.05);
                    const displayTax = isEditing ? (edited.finalTaxBdt || 0) : amounts.taxBdt;
                    const displayTotal = displayProductCost + displayServiceCharge + displayShippingCost + displayTax;

                    return (
                      <div className="bg-gray-50 rounded-lg p-4">
                        {/* Exchange Rate Field (when editing) */}
                        {isEditing && (
                          <div className="mb-4 pb-4 border-b">
                            <label className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Exchange Rate (BDT per USD):</span>
                              <input
                                type="number"
                                step="0.01"
                                value={edited.exchangeRate}
                                onChange={(e) => setEditedPricing({
                                  ...editedPricing,
                                  [order.id]: { ...edited, exchangeRate: parseFloat(e.target.value) || 0 }
                                })}
                                className="w-40 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </label>
                          </div>
                        )}

                        {/* Individual Item Price Editing */}
                        {isEditing && (
                          <div className="mb-6 p-4 border rounded-lg bg-blue-50">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Edit Individual Item Prices</h4>
                            <div className="space-y-3">
                              {edited.finalItems?.map((item: any, index: number) => (
                                <div key={`${item.id}-${index}`} className="flex items-center justify-between bg-white p-3 rounded border">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">
                                      {order.items[index]?.title || `Item ${index + 1}`}
                                    </p>
                                    <p className="text-xs text-gray-500">Quantity: {item.quantity}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">৳</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={item.finalPriceBdt}
                                      onChange={(e) => {
                                        const newPrice = parseFloat(e.target.value) || 0;
                                        const updatedItems = [...edited.finalItems];
                                        updatedItems[index] = { ...updatedItems[index], finalPriceBdt: newPrice };
                                        setEditedPricing({
                                          ...editedPricing,
                                          [order.id]: { ...edited, finalItems: updatedItems }
                                        });
                                      }}
                                      className="w-24 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <span className="text-xs text-gray-500">per item</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* BDT Breakdown */}
                          <div>
                            <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-3">
                              Customer Pricing (BDT) {amounts.isUpdated && !isEditing && <span className="text-blue-600">- Updated</span>}
                            </h4>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 flex items-center gap-2">
                                  Product Cost:
                                  {isEditing && <span className="text-xs text-blue-600">(Auto-calculated)</span>}
                                </span>
                                <span className="font-medium">{displayAmount(displayProductCost, 'BDT')}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Service Charge:</span>
                                <span className="font-medium">{displayAmount(displayServiceCharge, 'BDT')}</span>
                              </div>
                              {/* Shipping & Fees */}
                              {isEditing ? (
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <div
                                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 py-1 rounded flex-1"
                                      onClick={() => {
                                        const shippingExpanded = editedPricing[order.id]?.shippingExpanded || false;
                                        setEditedPricing({
                                          ...editedPricing,
                                          [order.id]: {
                                            ...edited,
                                            shippingExpanded: !shippingExpanded
                                          }
                                        });
                                      }}
                                    >
                                      <ChevronDownIcon
                                        className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                                          edited.shippingExpanded ? 'rotate-0' : '-rotate-90'
                                        }`}
                                      />
                                      <span className="text-gray-600">Shipping & Fees:</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm text-gray-500">৳</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={(edited.finalShippingOnlyBdt || 0) + (edited.finalAdditionalFeesBdt || 0)}
                                        onChange={(e) => {
                                          const totalShipping = parseFloat(e.target.value) || 0;
                                          // Put all the value into shipping cost, clear additional fees
                                          setEditedPricing({
                                            ...editedPricing,
                                            [order.id]: {
                                              ...edited,
                                              finalShippingOnlyBdt: totalShipping,
                                              finalAdditionalFeesBdt: 0,
                                              feeDescription: ''
                                            }
                                          });
                                        }}
                                        className="w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        title="Click to edit total shipping & fees, or use arrow to breakdown"
                                      />
                                    </div>
                                  </div>

                                  {edited.shippingExpanded && (
                                    <div className="ml-6 space-y-2 border-l-2 border-gray-200 pl-4">
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Shipping Cost:</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-sm text-gray-500">৳</span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={edited.finalShippingOnlyBdt}
                                            onChange={(e) => setEditedPricing({
                                              ...editedPricing,
                                              [order.id]: { ...edited, finalShippingOnlyBdt: parseFloat(e.target.value) || 0 }
                                            })}
                                            className="w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                          />
                                        </div>
                                      </div>

                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Additional Fees:</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-sm text-gray-500">৳</span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={edited.finalAdditionalFeesBdt}
                                            onChange={(e) => setEditedPricing({
                                              ...editedPricing,
                                              [order.id]: { ...edited, finalAdditionalFeesBdt: parseFloat(e.target.value) || 0 }
                                            })}
                                            className="w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                          />
                                        </div>
                                      </div>

                                      {edited.finalAdditionalFeesBdt > 0 && (
                                        <div className="flex justify-between text-sm">
                                          <span className="text-gray-600 text-sm">Fee Description:</span>
                                          <input
                                            type="text"
                                            value={edited.feeDescription}
                                            onChange={(e) => setEditedPricing({
                                              ...editedPricing,
                                              [order.id]: { ...edited, feeDescription: e.target.value }
                                            })}
                                            placeholder="e.g., Electronics handling"
                                            className="w-40 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <div
                                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 py-1 rounded flex-1"
                                      onClick={() => toggleShippingExpansion(order.id)}
                                    >
                                      <ChevronDownIcon
                                        className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                                          shippingExpanded.has(order.id) ? 'rotate-0' : '-rotate-90'
                                        }`}
                                      />
                                      <span className="text-gray-600">Shipping & Fees:</span>
                                    </div>
                                    <span className="font-medium">{displayShipping(displayShippingCost, 'BDT')}</span>
                                  </div>

                                  {shippingExpanded.has(order.id) && (
                                    <div className="ml-6 space-y-2 border-l-2 border-gray-200 pl-4">
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Shipping Cost:</span>
                                        <span className="font-medium">{displayShipping(amounts.finalShippingOnlyBdt || amounts.shippingCostBdt || 0, 'BDT')}</span>
                                      </div>

                                      {(amounts.finalAdditionalFeesBdt || 0) > 0 && (
                                        <>
                                          <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Additional Fees:</span>
                                            <span className="font-medium">{displayShipping(amounts.finalAdditionalFeesBdt, 'BDT')}</span>
                                          </div>

                                          {amounts.feeDescription && (
                                            <div className="flex justify-between text-sm">
                                              <span className="text-gray-600 text-sm">Fee Description:</span>
                                              <span className="text-sm text-gray-700 font-medium">{amounts.feeDescription}</span>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Tax:</span>
                                {isEditing ? (
                                  <div className="flex items-center">
                                    <span className="text-gray-400 mr-1">৳</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={edited.finalTaxBdt}
                                      onChange={(e) => setEditedPricing({
                                        ...editedPricing,
                                        [order.id]: { ...edited, finalTaxBdt: parseFloat(e.target.value) || 0 }
                                      })}
                                      className="w-24 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                  </div>
                                ) : (
                                  <span className="font-medium">{displayAmount(displayTax, 'BDT')}</span>
                                )}
                              </div>
                              <div className="border-t pt-2 mt-2">
                                <div className="flex justify-between text-sm font-semibold">
                                  <span className="text-gray-900">Total:</span>
                                  <span className="text-gray-900">{displayAmount(displayTotal, 'BDT')}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* USD Breakdown */}
                          <div>
                            <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-3">
                              USD Equivalent
                            </h4>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Product Cost:</span>
                                <span className="font-medium">${(displayProductCost / displayExchangeRate).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Service Charge:</span>
                                <span className="font-medium">${(displayServiceCharge / displayExchangeRate).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Shipping & Fees:</span>
                                <span className="font-medium">${(displayShippingCost / displayExchangeRate).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Tax:</span>
                                <span className="font-medium">${(displayTax / displayExchangeRate).toFixed(2)}</span>
                              </div>
                              <div className="border-t pt-2 mt-2">
                                <div className="flex justify-between text-sm font-semibold">
                                  <span className="text-gray-900">Total:</span>
                                  <span className="text-gray-900">${(displayTotal / displayExchangeRate).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {amounts.isUpdated && !isEditing && (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-xs text-blue-700">
                              <CheckCircleIcon className="inline h-3 w-3 mr-1" />
                              Pricing has been updated by admin. Final amounts are shown above.
                            </p>
                          </div>
                        )}

                        {isEditing && (
                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-xs text-yellow-700">
                              Edit individual item prices above. Product cost and service charge (5%) are automatically calculated from item totals. You can manually adjust exchange rate, shipping cost, and tax.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Products Section */}
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    <ShoppingBagIcon className="inline-block h-4 w-4 mr-1" />
                    Products ({order.items.length})
                  </h3>

                  <div className="space-y-3">
                    {(() => {
                      const updatedItems = getUpdatedItemPrices(order);
                      const amounts = getDisplayAmounts(order);
                      return updatedItems.map((item: any, index: number) => (
                      <div key={`${item.id}-${index}`} className="bg-white rounded-lg border p-4">
                        <div className="flex gap-4">
                          {/* Product Image */}
                          {item.image && (
                            <div className="flex-shrink-0">
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-20 h-20 object-cover rounded-md border"
                              />
                            </div>
                          )}

                          {/* Product Details */}
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                                  {item.title}
                                </h4>
                                <div className="mt-1 space-y-1">
                                  <p className="text-xs text-gray-500">
                                    Store: <span className="font-medium capitalize">{item.store}</span>
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Quantity: <span className="font-medium">{item.quantity}</span> |
                                    Weight: <span className="font-medium">{item.weight}kg</span>
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Original: <span className="font-medium">${item.originalPriceValue} {item.originalCurrency}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="text-right ml-4">
                                {item.priceUpdated ? (
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                      ৳{item.price.toLocaleString()}
                                    </p>
                                    {item.originalPrice && (
                                      <p className="text-xs text-gray-500 line-through">
                                        Original: ৳{item.originalPrice.toLocaleString()}
                                      </p>
                                    )}
                                    <p className="text-xs text-green-600 font-medium">
                                      Updated per item
                                    </p>
                                    {item.quantity > 1 && (
                                      <p className="text-xs font-medium text-gray-700 mt-1">
                                        Total: ৳{(item.price * item.quantity).toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                      ৳{item.price.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      per item
                                    </p>
                                    {item.quantity > 1 && (
                                      <p className="text-xs font-medium text-gray-700 mt-1">
                                        Total: ৳{(item.price * item.quantity).toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                              >
                                View on {item.store}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Shipping Address */}
                {order.shippingAddress && (
                  <div className="p-6 border-t">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Shipping Address</h3>
                    <div className="text-sm text-gray-600">
                      <p>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                      <p>{order.shippingAddress.street1}</p>
                      {order.shippingAddress.street2 && <p>{order.shippingAddress.street2}</p>}
                      <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                      <p>{order.shippingAddress.country}</p>
                      {order.shippingAddress.phone && <p>Phone: {order.shippingAddress.phone}</p>}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border rounded-lg shadow-sm">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!pagination.hasPrev}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!pagination.hasNext}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{currentPage}</span> of{' '}
                <span className="font-medium">{pagination.totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!pagination.hasPrev}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!pagination.hasNext}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {orders.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
          <ShoppingBagIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="text-gray-500 text-lg mt-4">No orders found</div>
          <div className="text-gray-400 text-sm mt-2">Try adjusting your search or filter criteria</div>
        </div>
      )}

    </div>
  );
}
