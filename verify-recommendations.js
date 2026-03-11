const http = require('http');

async function testRecommendations() {
    console.log("Testing Movie Recommendations API...");
    
    // 1. Test Turn API
    console.log("\n1. Testing Turn API...");
    const turnRes = await fetch('http://localhost:3000/api/turn/current');
    const turnData = await turnRes.json();
    console.log("Current Turn:", turnData);
    const memberId = turnData.memberId;

    // 2. Test Recommendations for current member
    console.log(`\n2. Testing Recommendations for ${memberId}...`);
    const recRes = await fetch(`http://localhost:3000/api/movies/recommendations?memberId=${memberId}&limit=3`);
    const recData = await recRes.json();
    console.log("Recommendations Count:", recData.results.length);
    console.log("Results Type distribution:", recData.results.map(m => m.recommendationType));
    
    if (recData.results.length === 3) {
        console.log("✅ Limit honored (3 items).");
    } else {
        console.log("❌ Limit NOT honored.");
    }

    const exploratory = recData.results.filter(m => m.recommendationType === 'exploratory');
    console.log(`Exploratory count: ${exploratory.length}`);
    if (exploratory.length === 1) {
        console.log("✅ Exploratory fraction honored (1/3).");
    } else {
        console.log("❌ Exploratory fraction mismatch.");
    }

    // 3. Test Fallback (for non-existent member)
    console.log("\n3. Testing Fallback behavior...");
    const fallbackRes = await fetch(`http://localhost:3000/api/movies/recommendations?memberId=UnknownPerson&limit=3`);
    const fallbackData = await fallbackRes.json();
    console.log("Fallback Note:", fallbackData.note);
    if (fallbackData.note && fallbackData.note.includes("Not enough personal history")) {
        console.log("✅ Fallback note displayed correctly.");
    } else {
        console.log("❌ Fallback note missing.");
    }

    console.log("\nVerification Finished.");
}

// Simple fetch polyfill for Node if needed (but modern Node has fetch)
if (typeof fetch !== 'function') {
    console.log("Note: This script requires Node 18+ with native fetch support.");
} else {
    testRecommendations().catch(err => {
        console.error("Test failed:", err);
        console.log("\nEnsure the dev server is running at http://localhost:3000 before testing.");
    });
}
