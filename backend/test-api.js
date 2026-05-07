/**
 * Test the /api/hospitals/nearby endpoint
 */

async function testNearbyHospitals() {
  // Bangalore coordinates
  const latitude = 12.9716;
  const longitude = 77.5946;
  const radius = 10; // 10km radius

  console.log('🏥 Testing /api/hospitals/nearby endpoint');
  console.log(`📍 Location: ${latitude}, ${longitude}`);
  console.log(`📏 Radius: ${radius}km\n`);

  try {
    const url = `http://localhost:5000/api/hospitals/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}&type=all`;
    console.log(`🔗 URL: ${url}\n`);

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}`);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }

    const data = await response.json();
    console.log(`✅ Response received!`);
    console.log(`📊 Total facilities: ${data.hospitals?.length || data.data?.length || 0}\n`);

    const facilities = data.hospitals || data.data || [];
    
    if (facilities && facilities.length > 0) {
      console.log('📋 First 5 facilities:');
      facilities.slice(0, 5).forEach((facility, idx) => {
        console.log(
          `  ${idx + 1}. ${facility.name} (${facility.type})`
        );
        console.log(
          `     📍 ${facility.address}, ${facility.city}`
        );
        console.log(
          `     📏 Distance: ${facility.distance ? facility.distance.toFixed(2) + ' km' : 'N/A'}`
        );
        console.log(
          `     🏷️  Source: ${facility.source || 'Unknown'}`
        );
        console.log();
      });

      // Check data sources
      const sources = {};
      facilities.forEach((f) => {
        const source = f.source || 'Unknown';
        sources[source] = (sources[source] || 0) + 1;
      });
      
      console.log('📈 Data source breakdown:');
      Object.entries(sources).forEach(([source, count]) => {
        console.log(`  ${source}: ${count} facilities`);
      });
    } else {
      console.log('⚠️  No facilities returned');
    }
  } catch (error) {
    console.error(`❌ Error:`, error.message);
  }
}

testNearbyHospitals();
