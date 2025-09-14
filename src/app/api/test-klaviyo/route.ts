import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const klaviyoApiKey = process.env.KLAVIYO_API_KEY;
    
    if (!klaviyoApiKey) {
      return NextResponse.json(
        { success: false, error: 'Klaviyo API key not configured' },
        { status: 500 }
      );
    }

    // Test Klaviyo API by creating/updating a profile (handle existing profiles)
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
            email: email,
            first_name: 'Test',
            last_name: 'User'
          }
        }
      })
    });

    let profileId = '';
    let profileStatus = '';
    
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      profileId = profileData.data.id;
      profileStatus = 'created';
      console.log('✅ Klaviyo profile created:', profileId);
    } else {
      const errorData = await profileResponse.json();
      if (errorData.errors?.[0]?.code === 'duplicate_profile') {
        profileId = errorData.errors[0].meta.duplicate_profile_id;
        profileStatus = 'already_exists';
        console.log('✅ Klaviyo profile already exists:', profileId);
      } else {
        console.error('Klaviyo profile creation failed:', errorData);
        return NextResponse.json(
          { success: false, error: 'Failed to create Klaviyo profile', details: errorData },
          { status: 500 }
        );
      }
    }

    // For now, just test profile creation/retrieval
    // Event creation can be added later when we implement actual flows
    return NextResponse.json({
      success: true,
      message: 'Klaviyo integration test successful!',
      profile: profileId,
      profileStatus: profileStatus,
      klaviyoReady: true
    });

  } catch (error) {
    console.error('Klaviyo test error:', error);
    return NextResponse.json(
      { success: false, error: 'Klaviyo test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}