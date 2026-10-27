const solc = require('solc');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('Solc version:', solc.version());

// Create artifacts directory if it doesn't exist
const artifactsDir = path.join(__dirname, 'artifacts');
const contractsDir = path.join(artifactsDir, 'contracts');
const cacheDir = path.join(__dirname, 'cache');
const buildInfoDir = path.join(cacheDir, 'solidity-files-v1');

[contractsDir, buildInfoDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Build input for solc
const input = {
  language: 'Solidity',
  sources: {},
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      '*': {
        '*': ['*']
      }
    }
  }
};

// Read all contract files
const contractFiles = [
  'contracts/CBDCToken.sol',
  'contracts/BondToken.sol',
  'contracts/DVPSettlement.sol'
];

contractFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const content = fs.readFileSync(filePath, 'utf8');
  input.sources[file] = { content };
});

// Manually add required OpenZeppelin files with dependencies
const openzeppelinDir = path.join(__dirname, 'node_modules', '@openzeppelin', 'contracts');

const filesToAdd = [
  'token/ERC20/ERC20.sol',
  'token/ERC20/IERC20.sol',
  'token/ERC20/extensions/ERC20Burnable.sol',
  'token/ERC20/extensions/IERC20Metadata.sol',
  'access/Ownable.sol',
  'access/Ownable2Step.sol',
  'utils/ReentrancyGuard.sol',
  'utils/Context.sol',
  'utils/StorageSlot.sol',
  'interfaces/draft-IERC6093.sol'
];

filesToAdd.forEach(file => {
  const filePath = path.join(openzeppelinDir, file);
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const key = '@openzeppelin/contracts/' + file;
      input.sources[key] = { content };
    } catch (e) {
      console.warn('Could not read:', file);
    }
  }
});

console.log('Sources to compile:', Object.keys(input.sources).length);

// Compile
console.log('\nCompiling...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const errors = output.errors.filter(e => e.severity === 'error');
  if (errors.length > 0) {
    console.error('Compilation errors:');
    errors.forEach(e => console.error(' -', e.message));
    process.exit(1);
  }
  const warnings = output.errors.filter(e => e.severity === 'warning');
  if (warnings.length > 0) {
    console.log('Warnings:');
    warnings.forEach(w => console.log(' -', w.message));
  }
}

// Generate build info
const buildInfo = {
  _format: 'hh-sol-build-info-1',
  solcVersion: solc.version(),
  solcLongVersion: solc.version(),
  input: input,
  output: output
};

const buildInfoHash = crypto.createHash('sha1').update(JSON.stringify(buildInfo)).digest('hex');
const buildInfoPath = path.join(buildInfoDir, buildInfoHash + '.json');
fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));

// Generate artifact files for each contract
const contracts = output.contracts || {};
for (const sourceFile in contracts) {
  for (const contractName in contracts[sourceFile]) {
    const contract = contracts[sourceFile][contractName];

    // Skip abstract contracts and interfaces
    if (contractName.startsWith('I') || contract.abi.length === 0) {
      continue;
    }

    const artifact = {
      _format: 'hh-sol-artifact-1',
      contractName: contractName,
      sourceName: sourceFile,
      abi: contract.abi,
      bytecode: contract.evm?.bytecode?.object || '0x',
      deployedBytecode: contract.evm?.deployedBytecode?.object || '0x',
      linkReferences: contract.evm?.bytecode?.linkReferences || {},
      deployedLinkReferences: contract.evm?.deployedBytecode?.linkReferences || {}
    };

    // Determine output path
    let outputPath;
    if (sourceFile.startsWith('contracts/')) {
      outputPath = path.join(contractsDir, contractName + '.json');
    } else if (sourceFile.startsWith('@openzeppelin/')) {
      const parts = sourceFile.split('/');
      const contractPath = path.join(contractsDir, ...parts.slice(0, -1));
      if (!fs.existsSync(contractPath)) {
        fs.mkdirSync(contractPath, { recursive: true });
      }
      outputPath = path.join(contractPath, parts[parts.length - 1].replace('.sol', '') + '.json');
    } else {
      continue;
    }

    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2));
    console.log('Generated:', path.relative(__dirname, outputPath));
  }
}

console.log('\nCompilation successful!');
console.log('Build info:', path.relative(__dirname, buildInfoPath));
