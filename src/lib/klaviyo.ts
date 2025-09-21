interface OrderItem {
  id: string;
  title: string;
  price: number;
  originalPriceValue?: number;
  quantity: number;
  image: string;
  url: string;
  store: string;
}

interface OrderConfirmationData {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  shippingAddress?: any;
  items: OrderItem[];
  subtotalBdt: number;
  serviceChargeBdt: number;
  taxBdt: number;
  totalAmountBdt: number;
  subtotalUsd: number;
  serviceChargeUsd: number;
  taxUsd: number;
  totalAmountUsd: number;
  exchangeRate: number;
  currency: string;
  orderDate: string;
}

interface PaymentConfirmationData {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  shippingAddress?: any;
  items: OrderItem[];
  productCostBdt: number;
  serviceChargeBdt: number;
  shippingCostBdt: number;
  finalShippingOnlyBdt?: number;
  finalAdditionalFeesBdt?: number;
  feeDescription?: string;
  taxBdt: number;
  totalAmountBdt: number;
  productCostUsd: number;
  serviceChargeUsd: number;
  shippingCostUsd: number;
  taxUsd: number;
  totalAmountUsd: number;
  exchangeRate: number;
  currency: string;
  orderDate: string;
}

interface USFacilityArrivalData {
  orderId: number;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: any;
  items: any[];
  itemCount: number;
  totalAmountBdt: number;
  formattedTotalBdt: string;
  formattedTotalUsd: string;
  exchangeRate: number;
  orderDate: Date;
  formattedOrderDate: string;
}

interface DeliveryOptionsData {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  deliveryAddress?: any;
  pickupAddress?: string;
  items: OrderItem[];
  packageWeight?: string;
  warehouseLocation?: string;
  arrivalDate?: string;
  homeDeliveryEstimate?: string;
  homeDeliveryFee?: number;
  homeDeliveryUrl?: string;
  pickupAvailableDate?: string;
  pickupHours?: string;
  pickupUrl?: string;
  trackOrderUrl?: string;
  supportPhone?: string;
  whatsappNumber?: string;
}

function formatShippingAddress(shippingAddress: any): string {
  if (!shippingAddress || Object.keys(shippingAddress).length === 0) {
    return 'To be provided during shipping';
  }
  
  const addressParts: string[] = [];
  
  // Add recipient name (firstName + lastName or just name)
  if (shippingAddress.firstName && shippingAddress.lastName) {
    addressParts.push(`${shippingAddress.firstName} ${shippingAddress.lastName}`);
  } else if (shippingAddress.name) {
    addressParts.push(shippingAddress.name);
  }
  
  // Add street address lines (handle both line1/line2 and street1/street2 formats)
  const street1 = shippingAddress.line1 || shippingAddress.street1;
  const street2 = shippingAddress.line2 || shippingAddress.street2;
  
  if (street1) {
    addressParts.push(street1);
  }
  if (street2) {
    addressParts.push(street2);
  }
  
  // Add city, state, postal code (handle both postal_code and postalCode formats)
  const postalCode = shippingAddress.postal_code || shippingAddress.postalCode;
  const cityStateZip = [
    shippingAddress.city,
    shippingAddress.state,
    postalCode
  ].filter(Boolean).join(', ');
  
  if (cityStateZip) {
    addressParts.push(cityStateZip);
  }
  
  if (shippingAddress.country) {
    addressParts.push(shippingAddress.country);
  }
  
  return addressParts.length > 0 ? addressParts.join('<br>') : 'To be provided during shipping';
}

export async function sendOrderConfirmationEmail(orderData: OrderConfirmationData) {
  try {
    const klaviyoApiKey = process.env.KLAVIYO_API_KEY;
    
    if (!klaviyoApiKey) {
      console.error('Klaviyo API key not configured');
      return { success: false, error: 'Klaviyo API key not configured' };
    }

    console.log('📧 Sending order confirmation email to:', orderData.customerEmail);
    console.log('🔍 KLAVIYO DEBUG - Order Data:', {
      orderId: orderData.orderId,
      orderNumber: orderData.orderNumber,
      customerEmail: orderData.customerEmail,
      customerName: orderData.customerName,
      itemCount: orderData.items.length,
      totalAmountBdt: orderData.totalAmountBdt
    });

    // Create/update customer profile
    const profileResponse = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email: orderData.customerEmail,
            first_name: orderData.customerName.split(' ')[0] || 'Customer',
            last_name: orderData.customerName.split(' ').slice(1).join(' ') || '',
            properties: {
              last_order_date: orderData.orderDate,
              total_orders: 1 // This should be dynamic in production
            }
          }
        }
      })
    });

    let profileId = '';
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      profileId = profileData.data.id;
      console.log('✅ Klaviyo profile created/updated:', profileId);
    } else {
      const errorData = await profileResponse.json();
      console.log('⚠️ Profile response error:', errorData);
      if (errorData.errors?.[0]?.code === 'duplicate_profile') {
        profileId = errorData.errors[0].meta.duplicate_profile_id;
        console.log('✅ Using existing profile ID:', profileId);
      } else {
        console.error('Failed to create/update Klaviyo profile:', errorData);
        return { success: false, error: 'Failed to create customer profile' };
      }
    }

    // Send order confirmation event using correct v2024-05-15 structure
    const eventData = {
      data: {
        type: 'event',
        attributes: {
          properties: {
            // Order details
            $event_id: orderData.orderId + '_' + Date.now(), // Unique event ID
            $value: orderData.totalAmountUsd,
            
            // Order info for email template
            order_id: orderData.orderId,
            order_number: orderData.orderNumber,
            customer_name: orderData.customerName,
            customer_email: orderData.customerEmail,
            customer_phone: orderData.customerPhone || 'To be provided during shipping',
            customer_address: formatShippingAddress(orderData.shippingAddress),
            total_amount_bdt: orderData.totalAmountBdt,
            formatted_total_bdt: `৳${orderData.totalAmountBdt.toFixed(2)}`,
            formatted_total_usd: `$${orderData.totalAmountUsd.toFixed(2)}`,
            order_date: orderData.orderDate,
            formatted_order_date: new Date(orderData.orderDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long', 
              day: 'numeric'
            }),
            
            // Items data
            items: orderData.items.map(item => ({
              product_id: item.id,
              product_name: item.title,
              product_image: item.image,
              product_url: item.url,
              price_bdt: item.price,
              price_usd: item.originalPriceValue || (item.price / orderData.exchangeRate),
              quantity: item.quantity,
              store: item.store
            })),
            
            // Financial details
            subtotal_bdt: orderData.subtotalBdt,
            service_charge_bdt: orderData.serviceChargeBdt,
            tax_bdt: orderData.taxBdt,
            subtotal_usd: orderData.subtotalUsd,
            service_charge_usd: orderData.serviceChargeUsd,
            tax_usd: orderData.taxUsd,
            currency: orderData.currency,
            exchange_rate: orderData.exchangeRate,
            item_count: orderData.items.length
          },
          time: new Date().toISOString(),
          value: orderData.totalAmountUsd,
          value_currency: 'USD',
          metric: {
            data: {
              type: 'metric',
              attributes: {
                name: 'Order Placed'
              }
            }
          },
          profile: {
            data: {
              type: 'profile', 
              id: profileId
            }
          }
        }
      }
    };

    console.log('🔍 Full event payload being sent:', JSON.stringify(eventData, null, 2));

    const eventResponse = await fetch('https://a.klaviyo.com/api/events/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify(eventData)
    });

    console.log('🔍 Event API Response Status:', eventResponse.status);
    
    if (!eventResponse.ok) {
      const errorText = await eventResponse.text();
      console.error('❌ Failed to send order confirmation event:', errorText);
      return { success: false, error: 'Failed to send order confirmation' };
    }

    let responseData;
    try {
      responseData = await eventResponse.json();
      console.log('✅ Event created successfully:', responseData);
    } catch (e) {
      // Handle case where response is empty but successful
      responseData = { data: { id: 'success' } };
      console.log('✅ Event created (empty response, but 200 OK)');
    }
    console.log('✅ Order confirmation email triggered - Event ID:', responseData.data?.id || 'success');

    return { 
      success: true, 
      profileId,
      eventId: responseData.data.id,
      message: 'Order confirmation email sent successfully'
    };

  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function sendPriceConfirmationEmail(orderData: PaymentConfirmationData) {
  try {
    const klaviyoApiKey = process.env.KLAVIYO_API_KEY;

    if (!klaviyoApiKey) {
      console.error('Klaviyo API key not configured');
      return { success: false, error: 'Klaviyo API key not configured' };
    }

    console.log('📧 Sending price confirmation email to:', orderData.customerEmail);
    console.log('🔍 KLAVIYO DEBUG - Price Confirmation Data:', {
      orderId: orderData.orderId,
      orderNumber: orderData.orderNumber,
      customerEmail: orderData.customerEmail,
      customerName: orderData.customerName,
      itemCount: orderData.items.length,
      totalAmountBdt: orderData.totalAmountBdt,
      totalAmountUsd: orderData.totalAmountUsd,
      productCostBdt: orderData.productCostBdt,
      serviceChargeBdt: orderData.serviceChargeBdt,
      taxBdt: orderData.taxBdt,
      shippingBreakdown: {
        shippingCostBdt: orderData.shippingCostBdt,
        finalShippingOnlyBdt: orderData.finalShippingOnlyBdt,
        finalAdditionalFeesBdt: orderData.finalAdditionalFeesBdt,
        feeDescription: orderData.feeDescription
      }
    });

    // Create/update customer profile
    const profileResponse = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email: orderData.customerEmail,
            first_name: orderData.customerName.split(' ')[0] || 'Customer',
            last_name: orderData.customerName.split(' ').slice(1).join(' ') || '',
            properties: {
              last_order_date: orderData.orderDate,
              total_orders: 1 // This should be dynamic in production
            }
          }
        }
      })
    });

    let profileId = '';
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      profileId = profileData.data.id;
      console.log('✅ Klaviyo profile created/updated:', profileId);
    } else {
      const errorData = await profileResponse.json();
      console.log('⚠️ Profile response error:', errorData);
      if (errorData.errors?.[0]?.code === 'duplicate_profile') {
        profileId = errorData.errors[0].meta.duplicate_profile_id;
        console.log('✅ Using existing profile ID:', profileId);
      } else {
        console.error('Failed to create/update Klaviyo profile:', errorData);
        return { success: false, error: 'Failed to create customer profile' };
      }
    }

    // Send payment confirmation event using correct v2024-05-15 structure
    const eventData = {
      data: {
        type: 'event',
        attributes: {
          properties: {
            // Event details
            $event_id: orderData.orderId + '_payment_confirmation_' + Date.now(), // Unique event ID
            $value: orderData.totalAmountUsd,

            // Order info for email template
            order_id: orderData.orderId,
            order_number: orderData.orderNumber,
            customer_name: orderData.customerName,
            customer_email: orderData.customerEmail,
            customer_phone: orderData.customerPhone || 'To be provided during shipping',
            customer_address: formatShippingAddress(orderData.shippingAddress),

            // Financial details with shipping breakdown
            product_cost_bdt: orderData.productCostBdt,
            service_charge_bdt: orderData.serviceChargeBdt,
            shipping_cost_bdt: orderData.shippingCostBdt,
            final_shipping_only_bdt: orderData.finalShippingOnlyBdt || orderData.shippingCostBdt,
            final_additional_fees_bdt: orderData.finalAdditionalFeesBdt || 0,
            fee_description: orderData.feeDescription || '',
            tax_bdt: orderData.taxBdt,
            total_amount_bdt: orderData.totalAmountBdt,

            // USD equivalents
            product_cost_usd: orderData.productCostUsd,
            service_charge_usd: orderData.serviceChargeUsd,
            shipping_cost_usd: orderData.shippingCostUsd,
            tax_usd: orderData.taxUsd,
            total_amount_usd: orderData.totalAmountUsd,

            // Formatted amounts
            formatted_total_bdt: `৳${Number(orderData.totalAmountBdt).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            formatted_total_usd: `$${Number(orderData.totalAmountUsd).toFixed(2)}`,
            formatted_product_cost_bdt: `৳${Number(orderData.productCostBdt).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            formatted_shipping_cost_bdt: `৳${Number(orderData.shippingCostBdt).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            formatted_service_charge_bdt: `৳${Number(orderData.serviceChargeBdt).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            formatted_tax_bdt: `৳${Number(orderData.taxBdt).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            formatted_additional_fees_bdt: orderData.finalAdditionalFeesBdt ? `৳${Number(orderData.finalAdditionalFeesBdt).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '৳0',

            order_date: orderData.orderDate,
            formatted_order_date: new Date(orderData.orderDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),

            // Items data
            items: orderData.items.map(item => ({
              product_id: item.id,
              product_name: item.title,
              product_image: item.image,
              product_url: item.url,
              price_bdt: item.price,
              price_usd: item.originalPriceValue || (item.price / orderData.exchangeRate),
              quantity: item.quantity,
              store: item.store
            })),

            currency: orderData.currency,
            exchange_rate: orderData.exchangeRate,
            item_count: orderData.items.length
          },
          time: new Date().toISOString(),
          value: orderData.totalAmountUsd,
          value_currency: 'USD',
          metric: {
            data: {
              type: 'metric',
              attributes: {
                name: 'Price Confirmation'
              }
            }
          },
          profile: {
            data: {
              type: 'profile',
              id: profileId
            }
          }
        }
      }
    };

    console.log('🔍 Full price confirmation event payload being sent:', JSON.stringify(eventData, null, 2));

    const eventResponse = await fetch('https://a.klaviyo.com/api/events/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify(eventData)
    });

    console.log('🔍 Price Confirmation Event API Response Status:', eventResponse.status);

    if (!eventResponse.ok) {
      const errorText = await eventResponse.text();
      console.error('❌ Failed to send price confirmation event:', errorText);
      return { success: false, error: 'Failed to send price confirmation' };
    }

    let responseData;
    try {
      responseData = await eventResponse.json();
      console.log('✅ Price confirmation event created successfully:', responseData);
    } catch (e) {
      // Handle case where response is empty but successful
      responseData = { data: { id: 'success' } };
      console.log('✅ Price confirmation event created (empty response, but 200 OK)');
    }
    console.log('✅ Price confirmation email triggered - Event ID:', responseData.data?.id || 'success');

    return {
      success: true,
      profileId,
      eventId: responseData.data.id,
      message: 'Price confirmation email sent successfully'
    };

  } catch (error) {
    console.error('Error sending price confirmation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function sendPaymentConfirmationEmail(orderData: PaymentConfirmationData) {
  try {
    const klaviyoApiKey = process.env.KLAVIYO_API_KEY;

    if (!klaviyoApiKey) {
      console.error('Klaviyo API key not configured');
      return { success: false, error: 'Klaviyo API key not configured' };
    }

    console.log('📧 Sending payment confirmation email to:', orderData.customerEmail);
    console.log('🔍 KLAVIYO DEBUG - Payment Confirmation Data:', {
      orderId: orderData.orderId,
      orderNumber: orderData.orderNumber,
      customerEmail: orderData.customerEmail,
      customerName: orderData.customerName,
      itemCount: orderData.items.length,
      totalAmountBdt: orderData.totalAmountBdt,
      totalAmountUsd: orderData.totalAmountUsd,
      productCostBdt: orderData.productCostBdt,
      serviceChargeBdt: orderData.serviceChargeBdt,
      shippingCostBdt: orderData.shippingCostBdt
    });

    // Create/update customer profile
    const profileResponse = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email: orderData.customerEmail,
            first_name: orderData.customerName.split(' ')[0] || 'Customer',
            last_name: orderData.customerName.split(' ').slice(1).join(' ') || '',
            properties: {
              last_order_date: orderData.orderDate,
              total_orders: 1
            }
          }
        }
      })
    });

    let profileId = '';
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      profileId = profileData.data.id;
      console.log('✅ Klaviyo profile created/updated:', profileId);
    } else {
      const errorData = await profileResponse.json();
      console.log('⚠️ Profile response error:', errorData);

      if (errorData.errors?.[0]?.code === 'duplicate_profile') {
        profileId = errorData.errors[0].meta.duplicate_profile_id;
        console.log('✅ Using existing profile ID:', profileId);
      } else {
        console.error('Failed to create/update Klaviyo profile:', errorData);
        return { success: false, error: 'Failed to create customer profile' };
      }
    }

    // Send payment confirmation event using correct v2024-05-15 structure
    const eventData = {
      data: {
        type: 'event',
        attributes: {
          properties: {
            // Event details
            $event_id: orderData.orderId + '_payment_confirmed_' + Date.now(),
            $value: orderData.totalAmountUsd,

            // Order info for email template
            order_id: orderData.orderId,
            order_number: orderData.orderNumber,
            customer_name: orderData.customerName,
            customer_email: orderData.customerEmail,
            customer_phone: orderData.customerPhone || 'To be provided during shipping',
            customer_address: formatShippingAddress(orderData.shippingAddress),
            transaction_id: orderData.stripePaymentIntentId || `TXN-${orderData.orderNumber}`,

            // Financial details
            product_cost_bdt: orderData.productCostBdt,
            service_charge_bdt: orderData.serviceChargeBdt,
            shipping_cost_bdt: orderData.shippingCostBdt,
            final_shipping_only_bdt: orderData.finalShippingOnlyBdt || orderData.shippingCostBdt,
            final_additional_fees_bdt: orderData.finalAdditionalFeesBdt || 0,
            fee_description: orderData.feeDescription || '',
            tax_bdt: orderData.taxBdt,
            total_amount_bdt: orderData.totalAmountBdt,

            // USD equivalents
            product_cost_usd: orderData.productCostUsd,
            service_charge_usd: orderData.serviceChargeUsd,
            shipping_cost_usd: orderData.shippingCostUsd,
            tax_usd: orderData.taxUsd,
            total_amount_usd: orderData.totalAmountUsd,

            // Formatted amounts for email
            formatted_total_bdt: `৳${Number(orderData.totalAmountBdt).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            formatted_total_usd: `$${Number(orderData.totalAmountUsd).toFixed(2)}`,
            formatted_product_cost_bdt: `৳${Number(orderData.productCostBdt).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            formatted_shipping_cost_bdt: `৳${Number(orderData.shippingCostBdt).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            formatted_service_charge_bdt: `৳${Number(orderData.serviceChargeBdt).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            formatted_tax_bdt: `৳${Number(orderData.taxBdt).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            formatted_additional_fees_bdt: orderData.finalAdditionalFeesBdt ? `৳${Number(orderData.finalAdditionalFeesBdt).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '৳0',

            order_date: orderData.orderDate,
            formatted_order_date: new Date(orderData.orderDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            formatted_payment_date: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),

            // Track order URL
            track_order_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://unishopper.com'}/orders/${orderData.orderId}`,

            // Individual item fields (for template compatibility)
            item_name_1: orderData.items[0]?.title || '',
            item_image_1: orderData.items[0]?.image || '',
            item_store_1: orderData.items[0]?.store || '',
            item_quantity_1: orderData.items[0]?.quantity || 0,
            item_price_1: orderData.items[0]?.price || 0,

            // Items data array (for reference)
            items: orderData.items.map(item => ({
              product_id: item.id,
              product_name: item.title,
              product_image: item.image,
              product_url: item.url,
              price_bdt: item.price,
              price_usd: item.originalPriceValue || (item.price / orderData.exchangeRate),
              quantity: item.quantity,
              store: item.store
            })),

            currency: orderData.currency,
            exchange_rate: orderData.exchangeRate,
            item_count: orderData.items.length
          },
          time: new Date().toISOString(),
          value: orderData.totalAmountUsd,
          value_currency: 'USD',
          metric: {
            data: {
              type: 'metric',
              attributes: {
                name: 'Payment Confirmation'
              }
            }
          },
          profile: {
            data: {
              type: 'profile',
              id: profileId
            }
          }
        }
      }
    };

    console.log('🔍 Full payment confirmation event payload being sent:', JSON.stringify(eventData, null, 2));

    const eventResponse = await fetch('https://a.klaviyo.com/api/events/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify(eventData)
    });

    console.log('🔍 Payment Confirmation Event API Response Status:', eventResponse.status);

    if (!eventResponse.ok) {
      const errorText = await eventResponse.text();
      console.error('❌ Failed to send payment confirmation event:', errorText);
      return { success: false, error: 'Failed to send payment confirmation' };
    }

    let responseData;
    try {
      responseData = await eventResponse.json();
      console.log('✅ Payment confirmation event created successfully:', responseData);
    } catch (e) {
      // Handle case where response is empty but successful
      responseData = { data: { id: 'success' } };
      console.log('✅ Payment confirmation event created (empty response, but 200 OK)');
    }
    console.log('✅ Payment confirmation email triggered - Event ID:', responseData.data?.id || 'success');

    return {
      success: true,
      profileId,
      eventId: responseData.data?.id || 'success',
      message: 'Payment confirmation email sent successfully'
    };

  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function sendUSFacilityArrivalEmail(facilityData: USFacilityArrivalData) {
  try {
    const klaviyoApiKey = process.env.KLAVIYO_API_KEY;

    if (!klaviyoApiKey) {
      console.error('Klaviyo API key not configured');
      return { success: false, error: 'Klaviyo API key not configured' };
    }

    console.log('📦 Sending US facility arrival email to:', facilityData.customerEmail);
    console.log('🔍 KLAVIYO DEBUG - US Facility Data:', {
      orderId: facilityData.orderId,
      orderNumber: facilityData.orderNumber,
      customerEmail: facilityData.customerEmail,
      customerName: facilityData.customerName,
      itemCount: facilityData.itemCount,
      totalAmountBdt: facilityData.totalAmountBdt
    });

    // Create/update customer profile
    const profileResponse = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email: facilityData.customerEmail,
            first_name: facilityData.customerName.split(' ')[0] || 'Customer',
            last_name: facilityData.customerName.split(' ').slice(1).join(' ') || '',
            properties: {
              last_facility_notification: facilityData.formattedOrderDate
            }
          }
        }
      })
    });

    let profileId = '';
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      profileId = profileData.data.id;
      console.log('✅ Klaviyo profile created/updated:', profileId);
    } else {
      console.warn('⚠️ Failed to create/update Klaviyo profile, but continuing with event creation');
      const profileError = await profileResponse.text();
      console.warn('Profile creation error:', profileError);

      // Handle the case where profile already exists (409 conflict)
      try {
        const errorData = JSON.parse(profileError);
        if (errorData.errors?.[0]?.code === 'duplicate_profile' && errorData.errors?.[0]?.meta?.duplicate_profile_id) {
          profileId = errorData.errors[0].meta.duplicate_profile_id;
          console.log('✅ Using existing profile ID:', profileId);
        }
      } catch (e) {
        console.warn('Could not parse profile error response');
      }
    }

    // Format the first few items for the email template
    const formatItemsForEmail = (items: any[]) => {
      return items.slice(0, 3).map((item, index) => ({
        [`item_name_${index + 1}`]: item.product?.title || item.title || 'Unknown Product',
        [`item_store_${index + 1}`]: item.product?.store || item.store || 'unknown',
        [`item_quantity_${index + 1}`]: item.quantity || 1,
        [`item_image_${index + 1}`]: item.product?.image || item.image || '',
        [`item_price_bdt_${index + 1}`]: (item.product?.price || item.price || 0).toLocaleString()
      }));
    };

    const formattedItems = formatItemsForEmail(facilityData.items);
    const itemFields = formattedItems.reduce((acc, item) => ({ ...acc, ...item }), {});

    // Send the event to Klaviyo using the exact same pattern as payment confirmation
    const eventData = {
      data: {
        type: 'event',
        attributes: {
          properties: {
            // Event details
            $event_id: facilityData.orderId + '_us_facility_arrival_' + Date.now(),
            $value: facilityData.totalAmountBdt / facilityData.exchangeRate,

            // Order details
            order_number: facilityData.orderNumber,
            order_id: facilityData.orderId.toString(),
            customer_name: facilityData.customerName,
            customer_email: facilityData.customerEmail,
            customer_phone: facilityData.customerPhone || '',
            customer_address: formatShippingAddress(facilityData.customerAddress),

            // Order totals
            total_amount_bdt: facilityData.totalAmountBdt,
            formatted_total_bdt: facilityData.formattedTotalBdt,
            formatted_total_usd: facilityData.formattedTotalUsd,
            exchange_rate: facilityData.exchangeRate,

            // Timeline information
            formatted_order_date: facilityData.formattedOrderDate,
            facility_arrival_date: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),

            // Items information
            item_count: facilityData.itemCount,
            ...itemFields,

            // Tracking information
            next_step: 'Quality check and consolidation in progress',
            expected_shipping_timeline: '3-5 business days for international shipping',

            // URL for order tracking
            order_details_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://unishopper.com'}/orders/${facilityData.orderNumber}`
          },
          time: new Date().toISOString(),
          value: facilityData.totalAmountBdt / facilityData.exchangeRate,
          value_currency: 'USD',
          metric: {
            data: {
              type: 'metric',
              attributes: {
                name: 'US Facility Arrival'
              }
            }
          },
          profile: {
            data: {
              type: 'profile',
              id: profileId
            }
          }
        }
      }
    };

    console.log('🔍 Full US facility arrival event payload being sent:', JSON.stringify(eventData, null, 2));

    const eventResponse = await fetch('https://a.klaviyo.com/api/events/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify(eventData)
    });

    console.log('🔍 US Facility Arrival Event API Response Status:', eventResponse.status);

    if (!eventResponse.ok) {
      const errorText = await eventResponse.text();
      console.error('❌ Failed to send US facility arrival event:', errorText);
      return { success: false, error: 'Failed to send US facility arrival email' };
    }

    let responseData;
    try {
      responseData = await eventResponse.json();
      console.log('✅ US facility arrival event created successfully:', responseData);
    } catch (e) {
      // Handle case where response is empty but successful
      responseData = { data: { id: 'success' } };
      console.log('✅ US facility arrival event created (empty response, but 200 OK)');
    }
    console.log('✅ US facility arrival email triggered - Event ID:', responseData.data?.id || 'success');

    return {
      success: true,
      profileId,
      eventId: responseData.data?.id || 'success',
      message: 'US facility arrival email sent successfully'
    };

  } catch (error) {
    console.error('Error sending US facility arrival email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function sendInternationalShippingEmail(order: any) {
  try {
    const klaviyoApiKey = process.env.KLAVIYO_API_KEY;

    if (!klaviyoApiKey) {
      console.error('Klaviyo API key not configured');
      return { success: false, error: 'Klaviyo API key not configured' };
    }

    const customerName = `${order.user.firstName} ${order.user.lastName}`.trim();
    console.log('✈️ Sending international shipping email to:', order.user.email);

    // Calculate totals and format data
    const finalTotalBdt = order.finalTotalAmountBdt || order.totalAmountBdt;
    const finalTotalUsd = order.finalTotalAmountUsd || order.totalAmountUsd;
    const orderItems = Array.isArray(order.items) ? order.items : [];
    const totalWeight = orderItems.reduce((sum: number, item: any) =>
      sum + ((item.weight || 0) * item.quantity), 0) || 0;

    // Create/update customer profile
    const profileResponse = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email: order.user.email,
            first_name: order.user.firstName || 'Customer',
            last_name: order.user.lastName || '',
            properties: {
              last_international_shipping_notification: new Date().toISOString()
            }
          }
        }
      })
    });

    let profileId = '';
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      profileId = profileData.data.id;
      console.log('✅ Klaviyo profile created/updated:', profileId);
    } else {
      console.warn('⚠️ Failed to create/update Klaviyo profile, but continuing with event creation');
      const profileError = await profileResponse.text();
      console.warn('Profile creation error:', profileError);

      // Handle the case where profile already exists (409 conflict)
      try {
        const errorData = JSON.parse(profileError);
        if (errorData.errors?.[0]?.code === 'duplicate_profile' && errorData.errors?.[0]?.meta?.duplicate_profile_id) {
          profileId = errorData.errors[0].meta.duplicate_profile_id;
          console.log('✅ Using existing profile ID:', profileId);
        }
      } catch (e) {
        console.warn('Could not parse profile error response');
      }
    }

    // Expected BD arrival date (15-20 days from now)
    const expectedArrival = new Date();
    expectedArrival.setDate(expectedArrival.getDate() + 18); // Average of 15-20 days

    // Send the event to Klaviyo
    const eventData = {
      data: {
        type: 'event',
        attributes: {
          properties: {
            // Event details
            $event_id: order.id + '_international_shipping_' + Date.now(),
            $value: finalTotalUsd,

            // Order details
            order_number: order.orderNumber,
            order_id: order.id.toString(),
            customer_name: customerName,
            customer_email: order.user.email,
            customer_phone: order.user.phone || '',
            customer_address: formatShippingAddress(order.shippingAddress),

            // Order totals
            formatted_total_bdt: `৳${finalTotalBdt.toLocaleString()}`,
            formatted_total_usd: `$${finalTotalUsd.toFixed(2)}`,
            exchange_rate: order.exchangeRate || 121.5,

            // Shipping information
            shipping_date: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            item_count: orderItems.length || 0,
            package_weight: totalWeight.toFixed(1),
            expected_bd_arrival: expectedArrival.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),

            // URL for order tracking
            order_details_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://unishopper.com'}/orders/${order.orderNumber}`
          },
          time: new Date().toISOString(),
          value: finalTotalUsd,
          value_currency: 'USD',
          metric: {
            data: {
              type: 'metric',
              attributes: {
                name: 'International Shipping'
              }
            }
          },
          profile: {
            data: {
              type: 'profile',
              id: profileId
            }
          }
        }
      }
    };

    console.log('🔍 International shipping event payload:', JSON.stringify(eventData, null, 2));

    const eventResponse = await fetch('https://a.klaviyo.com/api/events/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify(eventData)
    });

    console.log('🔍 International Shipping Event API Response Status:', eventResponse.status);

    if (!eventResponse.ok) {
      const errorText = await eventResponse.text();
      console.error('❌ Failed to send international shipping event:', errorText);
      return { success: false, error: 'Failed to send international shipping email' };
    }

    let responseData;
    try {
      responseData = await eventResponse.json();
      console.log('✅ International shipping event created successfully:', responseData);
    } catch (e) {
      responseData = { data: { id: 'success' } };
      console.log('✅ International shipping event created (empty response, but 200 OK)');
    }

    return {
      success: true,
      profileId,
      eventId: responseData.data?.id || 'success',
      message: 'International shipping email sent successfully'
    };

  } catch (error) {
    console.error('Error sending international shipping email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function sendBDWarehouseArrivalEmail(order: any) {
  try {
    const klaviyoApiKey = process.env.KLAVIYO_API_KEY;

    if (!klaviyoApiKey) {
      console.error('Klaviyo API key not configured');
      return { success: false, error: 'Klaviyo API key not configured' };
    }

    const customerName = `${order.user.firstName} ${order.user.lastName}`.trim();
    console.log('🏢 Sending BD warehouse arrival email to:', order.user.email);

    // Calculate totals and format data
    const finalTotalBdt = order.finalTotalAmountBdt || order.totalAmountBdt;
    const finalTotalUsd = order.finalTotalAmountUsd || order.totalAmountUsd;
    const orderItems = Array.isArray(order.items) ? order.items : [];
    const totalWeight = orderItems.reduce((sum: number, item: any) =>
      sum + ((item.weight || 0) * item.quantity), 0) || 0;

    // Create/update customer profile
    const profileResponse = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email: order.user.email,
            first_name: order.user.firstName || 'Customer',
            last_name: order.user.lastName || '',
            properties: {
              last_bd_warehouse_notification: new Date().toISOString()
            }
          }
        }
      })
    });

    let profileId = '';
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      profileId = profileData.data.id;
      console.log('✅ Klaviyo profile created/updated:', profileId);
    } else {
      console.warn('⚠️ Failed to create/update Klaviyo profile, but continuing with event creation');
      const profileError = await profileResponse.text();
      console.warn('Profile creation error:', profileError);

      // Handle the case where profile already exists (409 conflict)
      try {
        const errorData = JSON.parse(profileError);
        if (errorData.errors?.[0]?.code === 'duplicate_profile' && errorData.errors?.[0]?.meta?.duplicate_profile_id) {
          profileId = errorData.errors[0].meta.duplicate_profile_id;
          console.log('✅ Using existing profile ID:', profileId);
        }
      } catch (e) {
        console.warn('Could not parse profile error response');
      }
    }

    // Expected completion date (1-2 days from now)
    const expectedCompletion = new Date();
    expectedCompletion.setDate(expectedCompletion.getDate() + 2);

    // Send the event to Klaviyo
    const eventData = {
      data: {
        type: 'event',
        attributes: {
          properties: {
            // Event details
            $event_id: order.id + '_bd_warehouse_arrival_' + Date.now(),
            $value: finalTotalUsd,

            // Order details
            order_number: order.orderNumber,
            order_id: order.id.toString(),
            customer_name: customerName,
            customer_email: order.user.email,
            customer_phone: order.user.phone || '',
            customer_address: formatShippingAddress(order.shippingAddress),

            // Order totals
            formatted_total_bdt: `৳${finalTotalBdt.toLocaleString()}`,
            formatted_total_usd: `$${finalTotalUsd.toFixed(2)}`,
            exchange_rate: order.exchangeRate || 121.5,

            // BD warehouse information
            bd_arrival_date: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            item_count: orderItems.length || 0,
            package_weight: totalWeight.toFixed(1),
            current_process: 'Customs clearance and quality inspection in progress',
            expected_completion: expectedCompletion.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),

            // URL for order tracking
            order_details_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://unishopper.com'}/orders/${order.orderNumber}`
          },
          time: new Date().toISOString(),
          value: finalTotalUsd,
          value_currency: 'USD',
          metric: {
            data: {
              type: 'metric',
              attributes: {
                name: 'BD Warehouse Arrival'
              }
            }
          },
          profile: {
            data: {
              type: 'profile',
              id: profileId
            }
          }
        }
      }
    };

    console.log('🔍 BD warehouse arrival event payload:', JSON.stringify(eventData, null, 2));

    const eventResponse = await fetch('https://a.klaviyo.com/api/events/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify(eventData)
    });

    console.log('🔍 BD Warehouse Arrival Event API Response Status:', eventResponse.status);

    if (!eventResponse.ok) {
      const errorText = await eventResponse.text();
      console.error('❌ Failed to send BD warehouse arrival event:', errorText);
      return { success: false, error: 'Failed to send BD warehouse arrival email' };
    }

    let responseData;
    try {
      responseData = await eventResponse.json();
      console.log('✅ BD warehouse arrival event created successfully:', responseData);
    } catch (e) {
      responseData = { data: { id: 'success' } };
      console.log('✅ BD warehouse arrival event created (empty response, but 200 OK)');
    }

    return {
      success: true,
      profileId,
      eventId: responseData.data?.id || 'success',
      message: 'BD warehouse arrival email sent successfully'
    };

  } catch (error) {
    console.error('Error sending BD warehouse arrival email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Send Customer Choice Email (Pickup vs Delivery)
export async function sendCustomerChoiceEmail(params: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  orderDate: Date;
  items: any[];
  amounts: any;
  shippingAddress: any;
  domesticFulfillmentStatus: string;
}) {
  try {
    const klaviyoApiKey = process.env.KLAVIYO_API_KEY;
    if (!klaviyoApiKey) {
      throw new Error('KLAVIYO_API_KEY is not configured');
    }

    console.log(`📋 Preparing to send customer choice email for order ${params.orderNumber}`);

    // Create/update customer profile (same pattern as other functions)
    const profileResponse = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email: params.customerEmail,
            first_name: params.customerName.split(' ')[0] || 'Customer',
            last_name: params.customerName.split(' ').slice(1).join(' ') || ''
          }
        }
      })
    });

    let profileId = '';
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      profileId = profileData.data.id;
      console.log('✅ Klaviyo profile created/updated:', profileId);
    } else {
      const errorData = await profileResponse.json();
      console.log('⚠️ Profile response error:', errorData);
      if (errorData.errors?.[0]?.code === 'duplicate_profile') {
        profileId = errorData.errors[0].meta.duplicate_profile_id;
        console.log('✅ Using existing profile ID:', profileId);
      } else {
        console.error('Failed to create/update Klaviyo profile:', errorData);
        return { success: false, error: 'Failed to create customer profile' };
      }
    }

    // Create event for customer choice
    const eventData = {
      data: {
        type: 'event',
        attributes: {
          metric: {
            data: {
              type: 'metric',
              attributes: {
                name: 'Customer Choice Request'
              }
            }
          },
          properties: {
            order_number: params.orderNumber,
            order_date: params.orderDate.toISOString(),
            customer_name: params.customerName,
            customer_email: params.customerEmail,
            email_sent_date: new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),

            // Shipping address
            shipping_address_name: `${params.shippingAddress?.firstName || ''} ${params.shippingAddress?.lastName || ''}`.trim(),
            shipping_address_line1: params.shippingAddress?.street1 || '',
            shipping_address_line2: params.shippingAddress?.street2 || '',
            shipping_address_city: params.shippingAddress?.city || '',
            shipping_address_state: params.shippingAddress?.state || '',
            shipping_address_postal: params.shippingAddress?.postalCode || '',
            shipping_address_country: params.shippingAddress?.country || '',
            shipping_address_phone: params.shippingAddress?.phone || '',

            // Amounts
            formatted_total_bdt: params.amounts.formattedTotalBdt || '',
            formatted_total_usd: params.amounts.formattedTotalUsd || '',
            item_count: params.items.length,

            // Items (first 3 for template display) - fixed variable names
            item_name_1: params.items[0]?.title || '',
            item_store_1: params.items[0]?.store || '',
            item_quantity_1: params.items[0]?.quantity || 0,
            item_image_1: params.items[0]?.image || '',

            item_name_2: params.items[1]?.title || '',
            item_store_2: params.items[1]?.store || '',
            item_quantity_2: params.items[1]?.quantity || 0,
            item_image_2: params.items[1]?.image || '',

            item_name_3: params.items[2]?.title || '',
            item_store_3: params.items[2]?.store || '',
            item_quantity_3: params.items[2]?.quantity || 0,
            item_image_3: params.items[2]?.image || '',

            // Choice URLs (these would be replaced with actual choice page URLs)
            pickup_choice_url: `https://unishopper.com/orders/${params.orderNumber}/choose-pickup`,
            delivery_choice_url: `https://unishopper.com/orders/${params.orderNumber}/choose-delivery`
          },
          profile: {
            data: {
              type: 'profile',
              id: profileId
            }
          }
        }
      }
    };

    console.log('🔍 Customer choice event payload:', JSON.stringify(eventData, null, 2));

    const eventResponse = await fetch('https://a.klaviyo.com/api/events/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify(eventData)
    });

    console.log('🔍 Customer Choice Event API Response Status:', eventResponse.status);

    if (!eventResponse.ok) {
      const errorText = await eventResponse.text();
      console.error('❌ Failed to send customer choice event:', errorText);
      return { success: false, error: 'Failed to send customer choice email' };
    }

    let responseData;
    try {
      responseData = await eventResponse.json();
      console.log('✅ Customer choice event created successfully:', responseData);
    } catch (e) {
      responseData = { data: { id: 'success' } };
      console.log('✅ Customer choice event created (empty response, but 200 OK)');
    }

    return {
      success: true,
      profileId,
      eventId: responseData.data?.id || 'success',
      message: 'Customer choice email sent successfully'
    };

  } catch (error) {
    console.error('Error sending customer choice email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Send Pickup Confirmation Email
export async function sendPickupConfirmationEmail(params: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  orderDate: Date;
  items: any[];
  amounts: any;
  shippingAddress: any;
  pickupDetails?: any;
}) {
  try {
    const klaviyoApiKey = process.env.KLAVIYO_API_KEY;
    if (!klaviyoApiKey) {
      throw new Error('KLAVIYO_API_KEY is not configured');
    }

    console.log(`🏪 Preparing to send pickup confirmation email for order ${params.orderNumber}`);

    // Create/update customer profile (same pattern as other functions)
    const profileResponse = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email: params.customerEmail,
            first_name: params.customerName.split(' ')[0] || 'Customer',
            last_name: params.customerName.split(' ').slice(1).join(' ') || ''
          }
        }
      })
    });

    let profileId = '';
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      profileId = profileData.data.id;
      console.log('✅ Klaviyo profile created/updated:', profileId);
    } else {
      const errorData = await profileResponse.json();
      console.log('⚠️ Profile response error:', errorData);
      if (errorData.errors?.[0]?.code === 'duplicate_profile') {
        profileId = errorData.errors[0].meta.duplicate_profile_id;
        console.log('✅ Using existing profile ID:', profileId);
      } else {
        console.error('Failed to create/update Klaviyo profile:', errorData);
        return { success: false, error: 'Failed to create customer profile' };
      }
    }

    // Create event for pickup confirmation
    const eventData = {
      data: {
        type: 'event',
        attributes: {
          metric: {
            data: {
              type: 'metric',
              attributes: {
                name: 'Pickup Confirmation'
              }
            }
          },
          properties: {
            order_number: params.orderNumber,
            order_date: params.orderDate.toISOString(),
            customer_name: params.customerName,
            customer_email: params.customerEmail,
            email_sent_date: new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),

            // Pickup details - updated to match template variables
            pickup_location: 'UniShopper Dhaka Office<br>123 Main Street, Dhanmondi<br>Dhaka 1205, Bangladesh',
            pickup_date: 'Available Now',
            pickup_time: 'Monday - Saturday: 10:00 AM - 6:00 PM',
            contact_person: 'Customer Service',
            contact_phone: '+880 1234567890',
            formatted_order_date: params.orderDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),

            // Shipping address (for verification)
            shipping_address_name: `${params.shippingAddress?.firstName || ''} ${params.shippingAddress?.lastName || ''}`.trim(),
            shipping_address_phone: params.shippingAddress?.phone || '',

            // Track order URL
            track_order_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://unishopper.com'}/orders/${params.orderNumber}`,

            // Amounts
            formatted_total_bdt: params.amounts.formattedTotalBdt || '',
            formatted_total_usd: params.amounts.formattedTotalUsd || '',
            item_count: params.items.length,

            // Items (first 3 for template display) - fixed variable names
            item_name_1: params.items[0]?.title || '',
            item_store_1: params.items[0]?.store || '',
            item_quantity_1: params.items[0]?.quantity || 0,
            item_image_1: params.items[0]?.image || '',

            item_name_2: params.items[1]?.title || '',
            item_store_2: params.items[1]?.store || '',
            item_quantity_2: params.items[1]?.quantity || 0,
            item_image_2: params.items[1]?.image || '',

            item_name_3: params.items[2]?.title || '',
            item_store_3: params.items[2]?.store || '',
            item_quantity_3: params.items[2]?.quantity || 0,
            item_image_3: params.items[2]?.image || '',

            // Action URL
            order_tracking_url: `https://unishopper.com/orders/${params.orderNumber}`
          },
          profile: {
            data: {
              type: 'profile',
              id: profileId
            }
          }
        }
      }
    };

    console.log('🔍 Pickup confirmation event payload:', JSON.stringify(eventData, null, 2));

    const eventResponse = await fetch('https://a.klaviyo.com/api/events/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify(eventData)
    });

    console.log('🔍 Pickup Confirmation Event API Response Status:', eventResponse.status);

    if (!eventResponse.ok) {
      const errorText = await eventResponse.text();
      console.error('❌ Failed to send pickup confirmation event:', errorText);
      return { success: false, error: 'Failed to send pickup confirmation email' };
    }

    let responseData;
    try {
      responseData = await eventResponse.json();
      console.log('✅ Pickup confirmation event created successfully:', responseData);
    } catch (e) {
      responseData = { data: { id: 'success' } };
      console.log('✅ Pickup confirmation event created (empty response, but 200 OK)');
    }

    return {
      success: true,
      profileId,
      eventId: responseData.data?.id || 'success',
      message: 'Pickup confirmation email sent successfully'
    };

  } catch (error) {
    console.error('Error sending pickup confirmation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Send Delivery Confirmation Email
export async function sendDeliveryConfirmationEmail(params: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  orderDate: Date;
  items: any[];
  amounts: any;
  shippingAddress: any;
  deliveryDetails?: any;
}) {
  try {
    const klaviyoApiKey = process.env.KLAVIYO_API_KEY;
    if (!klaviyoApiKey) {
      throw new Error('KLAVIYO_API_KEY is not configured');
    }

    console.log(`🚚 Preparing to send delivery confirmation email for order ${params.orderNumber}`);

    // Create/update customer profile (same pattern as other functions)
    const profileResponse = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email: params.customerEmail,
            first_name: params.customerName.split(' ')[0] || 'Customer',
            last_name: params.customerName.split(' ').slice(1).join(' ') || ''
          }
        }
      })
    });

    let profileId = '';
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      profileId = profileData.data.id;
      console.log('✅ Klaviyo profile created/updated:', profileId);
    } else {
      const errorData = await profileResponse.json();
      console.log('⚠️ Profile response error:', errorData);
      if (errorData.errors?.[0]?.code === 'duplicate_profile') {
        profileId = errorData.errors[0].meta.duplicate_profile_id;
        console.log('✅ Using existing profile ID:', profileId);
      } else {
        console.error('Failed to create/update Klaviyo profile:', errorData);
        return { success: false, error: 'Failed to create customer profile' };
      }
    }

    // Create event for delivery confirmation
    const eventData = {
      data: {
        type: 'event',
        attributes: {
          metric: {
            data: {
              type: 'metric',
              attributes: {
                name: 'Delivery Confirmation'
              }
            }
          },
          properties: {
            order_number: params.orderNumber,
            order_date: params.orderDate.toISOString(),
            customer_name: params.customerName,
            customer_email: params.customerEmail,
            email_sent_date: new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),

            // Delivery details - updated to match template variables
            formatted_order_date: params.orderDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            delivery_address: formatShippingAddress(params.shippingAddress),
            delivery_date: 'Within 1-2 business days',
            delivery_time: '10:00 AM - 6:00 PM',
            delivery_partner: 'UniShopper Express',
            delivery_phone: '+880 1234567890',
            tracking_id: params.deliveryDetails?.trackingNumber || 'TRK' + Date.now(),
            support_phone: '+880 1234567890',
            track_order_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://unishopper.com'}/orders/${params.orderNumber}`,

            // Amounts
            formatted_total_bdt: params.amounts.formattedTotalBdt || '',
            formatted_total_usd: params.amounts.formattedTotalUsd || '',
            item_count: params.items.length,

            // Items (first 3 for template display) - fixed variable names
            item_name_1: params.items[0]?.title || '',
            item_store_1: params.items[0]?.store || '',
            item_quantity_1: params.items[0]?.quantity || 0,
            item_image_1: params.items[0]?.image || '',

            item_name_2: params.items[1]?.title || '',
            item_store_2: params.items[1]?.store || '',
            item_quantity_2: params.items[1]?.quantity || 0,
            item_image_2: params.items[1]?.image || '',

            item_name_3: params.items[2]?.title || '',
            item_store_3: params.items[2]?.store || '',
            item_quantity_3: params.items[2]?.quantity || 0,
            item_image_3: params.items[2]?.image || '',

            // Action URL
            order_tracking_url: `https://unishopper.com/orders/${params.orderNumber}`
          },
          profile: {
            data: {
              type: 'profile',
              id: profileId
            }
          }
        }
      }
    };

    console.log('🔍 Delivery confirmation event payload:', JSON.stringify(eventData, null, 2));

    const eventResponse = await fetch('https://a.klaviyo.com/api/events/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify(eventData)
    });

    console.log('🔍 Delivery Confirmation Event API Response Status:', eventResponse.status);

    if (!eventResponse.ok) {
      const errorText = await eventResponse.text();
      console.error('❌ Failed to send delivery confirmation event:', errorText);
      return { success: false, error: 'Failed to send delivery confirmation email' };
    }

    let responseData;
    try {
      responseData = await eventResponse.json();
      console.log('✅ Delivery confirmation event created successfully:', responseData);
    } catch (e) {
      responseData = { data: { id: 'success' } };
      console.log('✅ Delivery confirmation event created (empty response, but 200 OK)');
    }

    return {
      success: true,
      profileId,
      eventId: responseData.data?.id || 'success',
      message: 'Delivery confirmation email sent successfully'
    };

  } catch (error) {
    console.error('Error sending delivery confirmation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Send Final Pickup Confirmation Email (after pickup completion)
export async function sendFinalPickupConfirmationEmail(params: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  orderDate: Date;
  items: any[];
  amounts: any;
  shippingAddress: any;
  pickupDetails?: any;
}) {
  try {
    const klaviyoApiKey = process.env.KLAVIYO_API_KEY;
    if (!klaviyoApiKey) {
      throw new Error('KLAVIYO_API_KEY is not configured');
    }

    console.log(`🎉 Preparing to send final pickup confirmation email for order ${params.orderNumber}`);

    // Create/update customer profile (same pattern as other functions)
    const profileResponse = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email: params.customerEmail,
            first_name: params.customerName.split(' ')[0] || 'Customer',
            last_name: params.customerName.split(' ').slice(1).join(' ') || ''
          }
        }
      })
    });

    let profileId = '';
    if (profileResponse.ok) {
      try {
        const profileData = await profileResponse.json();
        profileId = profileData.data.id;
        console.log('✅ Klaviyo profile created/updated:', profileId);
      } catch (e) {
        console.error('Failed to parse profile response JSON:', e);
        return { success: false, error: 'Failed to parse profile response' };
      }
    } else {
      try {
        const errorData = await profileResponse.json();
        console.log('⚠️ Profile response error:', errorData);
        if (errorData.errors?.[0]?.code === 'duplicate_profile') {
          profileId = errorData.errors[0].meta.duplicate_profile_id;
          console.log('✅ Using existing profile ID:', profileId);
        } else {
          console.error('Failed to create/update Klaviyo profile:', errorData);
          return { success: false, error: 'Failed to create customer profile' };
        }
      } catch (e) {
        const errorText = await profileResponse.text();
        console.error('Failed to parse profile error response:', e, 'Response text:', errorText);
        return { success: false, error: `Failed to create customer profile: ${errorText}` };
      }
    }

    // Create event for final pickup confirmation with review focus
    const eventData = {
      data: {
        type: 'event',
        attributes: {
          metric: {
            data: {
              type: 'metric',
              attributes: {
                name: 'Final Pickup Confirmation'
              }
            }
          },
          properties: {
            order_number: params.orderNumber,
            order_date: params.orderDate.toISOString(),
            customer_name: params.customerName,
            customer_email: params.customerEmail,
            email_sent_date: new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),

            // Pickup completion details
            pickup_completion_date: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            pickup_location: 'UniShopper Dhaka Office<br>123 Main Street, Dhanmondi<br>Dhaka 1205, Bangladesh',
            contact_person: 'Customer Service',
            contact_phone: '+880 1234567890',
            formatted_order_date: params.orderDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),

            // Review and feedback CTAs
            review_request_message: 'We hope you love your products! Your feedback helps us serve you better.',
            web_review_url: `https://unishopper.com/reviews/create?order=${params.orderNumber}`,
            survey_url: `https://unishopper.com/survey?order=${params.orderNumber}`,
            support_url: `https://unishopper.com/support`,

            // Shipping address (for reference)
            shipping_address_name: `${params.shippingAddress?.firstName || ''} ${params.shippingAddress?.lastName || ''}`.trim(),
            shipping_address_phone: params.shippingAddress?.phone || '',

            // Track order URL
            track_order_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://unishopper.com'}/orders/${params.orderNumber}`,

            // Amounts
            formatted_total_bdt: params.amounts.formattedTotalBdt || '',
            formatted_total_usd: params.amounts.formattedTotalUsd || '',
            item_count: params.items.length,

            // Items array for template loop
            items: params.items.map(item => ({
              product_name: item.title || '',
              product_image: item.image || '',
              store: item.store || '',
              quantity: item.quantity || 0
            })),

            // Items (first 3 for template display) - same pattern as pickup confirmation
            item_name_1: params.items[0]?.title || '',
            item_store_1: params.items[0]?.store || '',
            item_quantity_1: params.items[0]?.quantity || 0,
            item_image_1: params.items[0]?.image || '',

            item_name_2: params.items[1]?.title || '',
            item_store_2: params.items[1]?.store || '',
            item_quantity_2: params.items[1]?.quantity || 0,
            item_image_2: params.items[1]?.image || '',

            item_name_3: params.items[2]?.title || '',
            item_store_3: params.items[2]?.store || '',
            item_quantity_3: params.items[2]?.quantity || 0,
            item_image_3: params.items[2]?.image || '',

            // Action URLs for review flow
            order_tracking_url: `https://unishopper.com/orders/${params.orderNumber}`,
            leave_review_url: `https://unishopper.com/reviews/create?order=${params.orderNumber}`
          },
          profile: {
            data: {
              type: 'profile',
              id: profileId
            }
          }
        }
      }
    };

    console.log('🔍 Final pickup confirmation event payload:', JSON.stringify(eventData, null, 2));

    const eventResponse = await fetch('https://a.klaviyo.com/api/events/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify(eventData)
    });

    console.log('🔍 Final Pickup Confirmation Event API Response Status:', eventResponse.status);

    if (!eventResponse.ok) {
      let errorText;
      try {
        const errorData = await eventResponse.json();
        errorText = JSON.stringify(errorData);
      } catch (e) {
        errorText = await eventResponse.text();
      }
      console.error('❌ Failed to send final pickup confirmation event:', errorText);
      return { success: false, error: `Failed to send final pickup confirmation email: ${errorText}` };
    }

    let responseData;
    try {
      responseData = await eventResponse.json();
      console.log('✅ Final pickup confirmation event created successfully:', responseData);
    } catch (e) {
      responseData = { data: { id: 'success' } };
      console.log('✅ Final pickup confirmation event created (empty response, but 200 OK)');
    }

    return {
      success: true,
      profileId,
      eventId: responseData.data?.id || 'success',
      message: 'Final pickup confirmation email sent successfully'
    };

  } catch (error) {
    console.error('Error sending final pickup confirmation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Send Final Delivery Confirmation Email (after delivery completion)
export async function sendFinalDeliveryConfirmationEmail(params: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  orderDate: Date;
  items: any[];
  amounts: any;
  shippingAddress: any;
  deliveryDetails?: any;
}) {
  try {
    const klaviyoApiKey = process.env.KLAVIYO_API_KEY;
    if (!klaviyoApiKey) {
      throw new Error('KLAVIYO_API_KEY is not configured');
    }

    console.log(`🎉 Preparing to send final delivery confirmation email for order ${params.orderNumber}`);

    // Create/update customer profile (same pattern as other functions)
    const profileResponse = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email: params.customerEmail,
            first_name: params.customerName.split(' ')[0] || 'Customer',
            last_name: params.customerName.split(' ').slice(1).join(' ') || ''
          }
        }
      })
    });

    let profileId = '';
    if (profileResponse.ok) {
      try {
        const profileData = await profileResponse.json();
        profileId = profileData.data.id;
        console.log('✅ Klaviyo profile created/updated:', profileId);
      } catch (e) {
        console.error('Failed to parse profile response JSON:', e);
        return { success: false, error: 'Failed to parse profile response' };
      }
    } else {
      try {
        const errorData = await profileResponse.json();
        console.log('⚠️ Profile response error:', errorData);
        if (errorData.errors?.[0]?.code === 'duplicate_profile') {
          profileId = errorData.errors[0].meta.duplicate_profile_id;
          console.log('✅ Using existing profile ID:', profileId);
        } else {
          console.error('Failed to create/update Klaviyo profile:', errorData);
          return { success: false, error: 'Failed to create customer profile' };
        }
      } catch (e) {
        const errorText = await profileResponse.text();
        console.error('Failed to parse profile error response:', e, 'Response text:', errorText);
        return { success: false, error: `Failed to create customer profile: ${errorText}` };
      }
    }

    // Create event for final delivery confirmation with review focus
    const eventData = {
      data: {
        type: 'event',
        attributes: {
          metric: {
            data: {
              type: 'metric',
              attributes: {
                name: 'Final Delivery Confirmation'
              }
            }
          },
          properties: {
            order_number: params.orderNumber,
            order_date: params.orderDate.toISOString(),
            customer_name: params.customerName,
            customer_email: params.customerEmail,
            email_sent_date: new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),

            // Delivery completion details
            delivery_completion_date: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            delivery_address: `${params.shippingAddress?.address1 || ''}<br>${params.shippingAddress?.city || ''}, ${params.shippingAddress?.zip || ''}`,
            formatted_order_date: params.orderDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),

            // Review and feedback CTAs
            review_request_message: 'Your order has been delivered! We hope you love your products. Please share your experience.',
            web_review_url: `https://unishopper.com/reviews/create?order=${params.orderNumber}`,
            survey_url: `https://unishopper.com/survey?order=${params.orderNumber}`,
            support_url: `https://unishopper.com/support`,

            // Shipping address (for reference)
            shipping_address_name: `${params.shippingAddress?.firstName || ''} ${params.shippingAddress?.lastName || ''}`.trim(),
            shipping_address_phone: params.shippingAddress?.phone || '',
            shipping_address_full: `${params.shippingAddress?.address1 || ''}, ${params.shippingAddress?.city || ''}, ${params.shippingAddress?.zip || ''}`,

            // Track order URL
            track_order_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://unishopper.com'}/orders/${params.orderNumber}`,

            // Amounts
            formatted_total_bdt: params.amounts.formattedTotalBdt || '',
            formatted_total_usd: params.amounts.formattedTotalUsd || '',
            item_count: params.items.length,

            // Items array for template loop
            items: params.items.map(item => ({
              product_name: item.title || '',
              product_image: item.image || '',
              store: item.store || '',
              quantity: item.quantity || 0
            })),

            // Items (first 3 for template display) - for backward compatibility
            item_name_1: params.items[0]?.title || '',
            item_store_1: params.items[0]?.store || '',
            item_quantity_1: params.items[0]?.quantity || 0,
            item_image_1: params.items[0]?.image || '',

            item_name_2: params.items[1]?.title || '',
            item_store_2: params.items[1]?.store || '',
            item_quantity_2: params.items[1]?.quantity || 0,
            item_image_2: params.items[1]?.image || '',

            item_name_3: params.items[2]?.title || '',
            item_store_3: params.items[2]?.store || '',
            item_quantity_3: params.items[2]?.quantity || 0,
            item_image_3: params.items[2]?.image || '',

            // Action URLs for review flow
            order_tracking_url: `https://unishopper.com/orders/${params.orderNumber}`,
            leave_review_url: `https://unishopper.com/reviews/create?order=${params.orderNumber}`
          },
          profile: {
            data: {
              type: 'profile',
              id: profileId
            }
          }
        }
      }
    };

    console.log('🔍 Final delivery confirmation event payload:', JSON.stringify(eventData, null, 2));

    const eventResponse = await fetch('https://a.klaviyo.com/api/events/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify(eventData)
    });

    console.log('🔍 Final Delivery Confirmation Event API Response Status:', eventResponse.status);

    if (!eventResponse.ok) {
      let errorText;
      try {
        const errorData = await eventResponse.json();
        errorText = JSON.stringify(errorData);
      } catch (e) {
        errorText = await eventResponse.text();
      }
      console.error('❌ Failed to send final delivery confirmation event:', errorText);
      return { success: false, error: `Failed to send final delivery confirmation email: ${errorText}` };
    }

    let responseData;
    try {
      responseData = await eventResponse.json();
      console.log('✅ Final delivery confirmation event created successfully:', responseData);
    } catch (e) {
      responseData = { data: { id: 'success' } };
      console.log('✅ Final delivery confirmation event created (empty response, but 200 OK)');
    }

    return {
      success: true,
      profileId,
      eventId: responseData.data?.id || 'success',
      message: 'Final delivery confirmation email sent successfully'
    };

  } catch (error) {
    console.error('Error sending final delivery confirmation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function sendDeliveryOptionsEmail(deliveryData: DeliveryOptionsData) {
  try {
    const klaviyoApiKey = process.env.KLAVIYO_API_KEY;

    if (!klaviyoApiKey) {
      console.error('Klaviyo API key not configured');
      return { success: false, error: 'Klaviyo API key not configured' };
    }

    console.log('📦 Sending delivery options email to:', deliveryData.customerEmail);
    console.log('🔍 KLAVIYO DEBUG - Delivery Options Data:', {
      orderId: deliveryData.orderId,
      orderNumber: deliveryData.orderNumber,
      customerEmail: deliveryData.customerEmail,
      customerName: deliveryData.customerName,
      warehouseLocation: deliveryData.warehouseLocation,
      homeDeliveryFee: deliveryData.homeDeliveryFee
    });

    // Create/update customer profile
    const profileResponse = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email: deliveryData.customerEmail,
            first_name: deliveryData.customerName.split(' ')[0] || 'Customer',
            last_name: deliveryData.customerName.split(' ').slice(1).join(' ') || '',
            phone_number: deliveryData.customerPhone || ''
          }
        }
      })
    });

    let profileId = '';
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      profileId = profileData.data.id;
      console.log('✅ Klaviyo profile created/updated:', profileId);
    } else {
      const errorData = await profileResponse.json();
      console.log('⚠️ Profile response error:', errorData);
      if (errorData.errors?.[0]?.code === 'duplicate_profile') {
        profileId = errorData.errors[0].meta.duplicate_profile_id;
        console.log('✅ Using existing profile ID:', profileId);
      } else {
        console.error('Failed to create/update Klaviyo profile:', errorData);
        return { success: false, error: 'Failed to create customer profile' };
      }
    }

    // Send delivery options event
    const eventData = {
      data: {
        type: 'event',
        attributes: {
          properties: {
            // Event details
            $event_id: deliveryData.orderId + '_delivery_options_' + Date.now(),

            // Order info for email template
            order_id: deliveryData.orderId,
            order_number: deliveryData.orderNumber,
            customer_name: deliveryData.customerName,
            customer_email: deliveryData.customerEmail,
            customer_phone: deliveryData.customerPhone || 'Not provided',

            // Delivery addresses
            delivery_address: formatShippingAddress(deliveryData.deliveryAddress),
            pickup_address: deliveryData.pickupAddress || 'UniShopper Dhaka Office',

            // Package details
            package_weight: deliveryData.packageWeight || 'To be calculated',
            warehouse_location: deliveryData.warehouseLocation || 'Bangladesh Warehouse',
            arrival_date: deliveryData.arrivalDate || new Date().toLocaleDateString(),

            // Home delivery options
            home_delivery_estimate: deliveryData.homeDeliveryEstimate || '2-3 business days',
            home_delivery_fee: deliveryData.homeDeliveryFee || 150,
            home_delivery_url: deliveryData.homeDeliveryUrl || `https://unishopper.com/orders/${deliveryData.orderId}/delivery`,

            // Pickup options
            pickup_available_date: deliveryData.pickupAvailableDate || 'Available now',
            pickup_hours: deliveryData.pickupHours || '10:00 AM - 6:00 PM',
            pickup_url: deliveryData.pickupUrl || `https://unishopper.com/orders/${deliveryData.orderId}/pickup`,

            // Support info
            track_order_url: deliveryData.trackOrderUrl || `https://unishopper.com/orders/${deliveryData.orderNumber}`,
            support_phone: deliveryData.supportPhone || '+880 1234567890',
            whatsapp_number: deliveryData.whatsappNumber || '+880 1234567890',

            // Items info - Include first 3 items
            item_name_1: deliveryData.items[0]?.title || '',
            item_store_1: deliveryData.items[0]?.store || '',
            item_quantity_1: deliveryData.items[0]?.quantity || 0,
            item_image_1: deliveryData.items[0]?.image || '',

            item_name_2: deliveryData.items[1]?.title || '',
            item_store_2: deliveryData.items[1]?.store || '',
            item_quantity_2: deliveryData.items[1]?.quantity || 0,
            item_image_2: deliveryData.items[1]?.image || '',

            item_name_3: deliveryData.items[2]?.title || '',
            item_store_3: deliveryData.items[2]?.store || '',
            item_quantity_3: deliveryData.items[2]?.quantity || 0,
            item_image_3: deliveryData.items[2]?.image || ''
          },
          profile: {
            data: {
              type: 'profile',
              id: profileId
            }
          },
          metric: {
            data: {
              type: 'metric',
              attributes: {
                name: 'Delivery Options Sent'
              }
            }
          }
        }
      }
    };

    console.log('🔍 Sending delivery options event to Klaviyo...');
    const eventResponse = await fetch('https://a.klaviyo.com/api/events/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-05-15'
      },
      body: JSON.stringify(eventData)
    });

    if (!eventResponse.ok) {
      const errorText = await eventResponse.text();
      console.error('❌ Failed to send delivery options event:', errorText);
      return { success: false, error: 'Failed to send delivery options email' };
    }

    let responseData;
    try {
      responseData = await eventResponse.json();
      console.log('✅ Delivery options event created successfully:', responseData);
    } catch (e) {
      responseData = { data: { id: 'success' } };
      console.log('✅ Delivery options event created (empty response, but 200 OK)');
    }
    console.log('✅ Delivery options email triggered - Event ID:', responseData.data?.id || 'success');

    return {
      success: true,
      profileId,
      eventId: responseData.data?.id || 'success',
      message: 'Delivery options email sent successfully'
    };

  } catch (error) {
    console.error('Error sending delivery options email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}