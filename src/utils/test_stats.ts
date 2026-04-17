import { calculateSpeedStats } from './stats';

const testStats = () => {
  const baseSpeed = 135;
  const stats = calculateSpeedStats(baseSpeed);

  console.log(`Base Speed: ${baseSpeed}`);
  console.log(`Max+: ${stats.maxPlus} (Expected: 205)`);
  console.log(`Max: ${stats.maxNeutral} (Expected: 187)`);
  console.log(`Uninvested: ${stats.uninvested} (Expected: 155)`);
  console.log(`Min-: ${stats.minMinus} (Expected: 139)`);

  const passed = 
    stats.maxPlus === 205 && 
    stats.maxNeutral === 187 && 
    stats.uninvested === 155 && 
    stats.minMinus === 139;

  if (passed) {
    console.log('✓ All stat calculation tests passed!');
  } else {
    console.error('✗ Stat calculation tests failed!');
    process.exit(1);
  }
};

testStats();
