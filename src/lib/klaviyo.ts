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