/**
 * Test script to verify Overpass API connectivity with fallback endpoints
 */

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',        // Primary (public server)
  'https://overpass.kumi.systems/api/interpreter',  // Fallback 1
  'https://z.overpass-api.de/api/interpreter',      // Fallback 2
];

async function testEndpoint(endpoint, latitude, longitude, timeout = 20000) {
  const query = `
    [timeout:10];
    (
      node["amenity"="hospital"](around:5000,${latitude},${longitude});
      way["amenity"="hospital"](around:5000,${latitude},${longitude});
      node["healthcare"="hospital"](around:5000,${latitude},${longitude});
      way["healthcare"="hospital"](around:5000,${latitude},${longitude});
      node["amenity"="clinic"](around:5000,${latitude},${longitude});
      way["amenity"="clinic"](around:5000,${latitude},${longitude});
      node["amenity"="pharmacy"](around:5000,${latitude},${longitude});
      way["amenity"="pharmacy"](around:5000,${latitude},${longitude});
    );
    out center;
  `.replace(/\n/g, ' ');

  console.log(`\n⚡ Testing: ${endpoint}`);
  console.log(`⏱️  Timeout: ${timeout}ms`);

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    );

    const startTime = Date.now();

    const response = await Promise.race([
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Telemedicine-App/1.0 (https://github.com/telemedicine-app)',
        },
        body: `data=${encodeURIComponent(query)}`,
      }),
      timeoutPromise,
    ]);

    const elapsed = Date.now() - startTime;
    console.log(`  ⏱️  Response time: ${elapsed}ms`);

    if (!response.ok) {
      const text = await response.text();
      console.log(`  ❌ HTTP ${response.status}`);
      if (text.length < 200) console.log(`  Response: ${text.substring(0, 200)}`);
      return false;
    }

    const data = await response.json();
    console.log(
      `  ✅ SUCCESS! Got ${data.elements?.length || 0} facilities`
    );
    return true;
  } catch (error) {
    console.log(`  ❌ ${error.message}`);
    return false;
  }
}

async function testAll() {
  const latitude = 12.9716; // Bangalore
  const longitude = 77.5946;

  console.log('🧪 Testing Overpass API Endpoints');
  console.log(`📍 Location: Bangalore (${latitude}, ${longitude})`);
  console.log('='.repeat(60));

  let successCount = 0;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const success = await testEndpoint(endpoint, latitude, longitude);
    if (success) successCount++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Results: ${successCount}/${OVERPASS_ENDPOINTS.length} endpoints working`);

  if (successCount === 0) {
    console.log('\n⚠️  All Overpass servers appear to be down or overloaded.');
    console.log('Recommendation: Use cached hospital data or switch to different API.');
  } else if (successCount < OVERPASS_ENDPOINTS.length) {
    console.log('\n✅ Some endpoints are working - the app will use the working ones.');
  } else {
    console.log('\n✅ All endpoints are responsive!');
  }
}

testAll();
