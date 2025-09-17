'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCart } from '@/lib/cart-context';
import { formatBdtPrice } from '@/lib/currency';
import { calculateCartTotals } from '@/lib/shipping';
import { displayShipping } from '@/lib/display-utils';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutFormProps {
  clientSecret: string;
  orderData: any;
  setPaymentSuccessful: (success: boolean) => void;
  session: any;
}

function CheckoutForm({ clientSecret, orderData, setPaymentSuccessful, session }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [shippingAddress, setShippingAddress] = useState<any>(null);

  // Load shipping address from sessionStorage
  useEffect(() => {
    const addressData = sessionStorage.getItem('shippingAddress');
    if (addressData) {
      setShippingAddress(JSON.parse(addressData));
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders/${orderData.orderId}?success=true`,
      },
      redirect: 'if_required', // This allows us to handle success here
    });

    if (error) {
      setErrorMessage(error.message || 'An error occurred during payment');
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Payment succeeded - capture customer information
      try {
        // Get address from sessionStorage (from information step)
        const storedAddress = sessionStorage.getItem('shippingAddress');
        const addressData = storedAddress ? JSON.parse(storedAddress) : null;
        
        // Update order with real customer information
        const updateResponse = await fetch(`/api/orders/${orderData.orderId}/update-customer-info`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            shippingAddress: addressData,
          }),
        });
        
        if (updateResponse.ok) {
          console.log('✅ Customer information updated');
        }
      } catch (err) {
        console.error('Error updating customer info:', err);
      }
      
      // Set payment successful flag, clear cart and redirect
      setPaymentSuccessful(true);
      clearCart();
      router.push(`/orders/${orderData.orderId}?success=true`);
    }
  };

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
            <button 
              onClick={() => router.push('/checkout/information')}
              className="text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            >
              Information
            </button>
            <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-2" />
            <span className="text-gray-900 font-medium">Payment</span>
          </nav>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side - Contact & Payment */}
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
                  <button
                    type="button"
                    onClick={() => router.push('/checkout/information')}
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    Change
                  </button>
                </div>
                <p className="text-gray-700">{session?.user?.email || orderData?.customerEmail || 'guest@example.com'}</p>
              </div>

              {/* Shipping Address */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Ship to</h2>
                  <button
                    type="button"
                    onClick={() => router.push('/checkout/information')}
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    Change
                  </button>
                </div>
                
                {shippingAddress ? (
                  <div className="text-gray-700">
                    <p className="font-medium">{shippingAddress.firstName} {shippingAddress.lastName}</p>
                    <p>{shippingAddress.street1}</p>
                    {shippingAddress.street2 && <p>{shippingAddress.street2}</p>}
                    <p>
                      {shippingAddress.city}
                      {shippingAddress.state && `, ${shippingAddress.state}`} {shippingAddress.postalCode}
                    </p>
                    <p>{shippingAddress.country}</p>
                    <p className="text-sm text-gray-500 mt-1">{shippingAddress.phone}</p>
                  </div>
                ) : (
                  <p className="text-gray-500">Loading address...</p>
                )}
              </div>

              {/* Payment Information */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Payment Information
                </h2>
                <PaymentElement />
                
                {errorMessage && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{errorMessage}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Order Summary */}
            <div className="space-y-6">
              {/* Order Items */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Order Summary ({orderData.cart.itemCount} items)
                </h2>
                
                <div className="space-y-4 mb-6">
                  {orderData.cart.items.map((item: any, index: number) => (
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
                    <span className="font-medium">{formatBdtPrice(orderData.totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Service Charge</span>
                    <span className="font-medium">{formatBdtPrice(orderData.totals.serviceCharge)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping & Fees</span>
                    <span className="font-medium">{displayShipping(orderData.totals.shipping || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Estimated taxes</span>
                    <span className="font-medium">{formatBdtPrice(orderData.totals.tax || 0)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex justify-between">
                      <span className="text-base font-semibold">Total</span>
                      <span className="text-base font-bold">{formatBdtPrice(orderData.totals.total)}</span>
                    </div>
                  </div>

                  {/* Shipping Notice */}
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      <span className="text-red-500">*</span> Electronics and battery-related items may carry additional fees. Final shipping costs and fees will be calculated and emailed within 24 hours of order.
                    </p>
                  </div>
                </div>
              </div>

              {/* Complete Order Button */}
              <button
                type="submit"
                disabled={!stripe || !elements || isProcessing}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : `Complete Order - ${formatBdtPrice(orderData.totals.total)}`}
              </button>

              {/* Security Notice */}
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  🔒 Your payment information is secure and encrypted
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { state, isInitialized } = useCart();
  const [clientSecret, setClientSecret] = useState<string>('');
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentSuccessful, setPaymentSuccessful] = useState(false);
  const isCreatingPaymentIntent = useRef(false);
  const hasCreatedPaymentIntent = useRef(false);

  useEffect(() => {
    // Don't check cart until it's loaded from localStorage
    if (!isInitialized) return;

    // Don't redirect if payment was successful
    if (state.cart.items.length === 0 && !paymentSuccessful) {
      console.log('Cart is empty, redirecting to /cart');
      router.push('/cart');
      return;
    }

    // Check if shipping address is available, if not redirect to information page
    // Only redirect if we're not already on the information page
    const shippingAddress = sessionStorage.getItem('shippingAddress');
    const currentPath = window.location.pathname;
    if (!shippingAddress && !paymentSuccessful && currentPath !== '/checkout/information') {
      console.log('No shipping address found, redirecting to information page');
      router.push('/checkout/information');
      return;
    }

    // Prevent duplicate payment intent creation using refs
    if (isCreatingPaymentIntent.current || hasCreatedPaymentIntent.current || clientSecret) {
      setLoading(false);
      return;
    }

    const createPaymentIntent = async () => {
      // Mark that we're creating a payment intent
      isCreatingPaymentIntent.current = true;

      try {
        const totals = calculateCartTotals(
          state.cart.items.map(item => ({
            price: item.product.price,
            quantity: item.quantity,
            weight: item.product.weight
          }))
        );

        console.log('🔍 Checkout totals result:', totals);

        // Generate idempotency key based on cart contents (including quantities to prevent duplicates)
        const cartHash = state.cart.items.map(i => `${i.product.id}:${i.quantity}`).sort().join('|');
        const idempotencyKey = `checkout-${session?.user?.id || 'guest'}-${btoa(cartHash)}`;

        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify({
            cartItems: state.cart.items,
            totals,
            customerInfo: {
              email: session?.user?.email || 'guest@example.com',
            }
          }),
        });

        const result = await response.json();

        if (result.success) {
          setClientSecret(result.clientSecret);
          setOrderData({
            cart: state.cart,
            totals,
            orderId: result.orderId
          });
          hasCreatedPaymentIntent.current = true;
        } else {
          setError(result.error || 'Failed to initialize payment');
          isCreatingPaymentIntent.current = false; // Reset on error to allow retry
        }
      } catch (err) {
        setError('Something went wrong. Please try again.');
        isCreatingPaymentIntent.current = false; // Reset on error to allow retry
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [isInitialized, state.cart.items.length, router, paymentSuccessful, session?.user?.email]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/cart')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Back to Cart
          </button>
        </div>
      </div>
    );
  }

  if (!clientSecret || !orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#2563eb',
    },
  };

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance,
      }}
    >
      <CheckoutForm clientSecret={clientSecret} orderData={orderData} setPaymentSuccessful={setPaymentSuccessful} session={session} />
    </Elements>
  );
}