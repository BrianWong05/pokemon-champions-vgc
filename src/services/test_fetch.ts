import { fetchRegulationMAPokemonSpeed } from './pokemon';

const testFetch = async () => {
  try {
    const data = await fetchRegulationMAPokemonSpeed();
    console.log(`Fetched ${data.length} Pokemon for Regulation M-A`);
    
    if (data.length > 0) {
      console.log('Sample Data (First 3):');
      data.slice(0, 3).forEach((p) => {
        console.log(`- ${p.name} (Base Speed: ${p.baseSpeed})`);
        console.log(`  Speeds: ${JSON.stringify(p.speeds)}`);
      });
      
      // Verify sorting
      const sorted = data.every((p, i) => i === 0 || p.baseSpeed <= data[i-1].baseSpeed);
      if (sorted) {
        console.log('✓ Results are correctly sorted by baseSpeed descending.');
      } else {
        console.error('✗ Results are not correctly sorted!');
      }
    } else {
      console.log('No Pokemon found. Is the Regulation M-A format in the database?');
    }
  } catch (error) {
    console.error('Error during fetch:', error);
  }
};

testFetch();
