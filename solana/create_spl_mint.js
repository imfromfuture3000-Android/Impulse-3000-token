// create_spl_mint.js
// Usage: node create_spl_mint.js --rpc <RPC_URL> --keypair <KEYPAIR_PATH> --decimals 9 --supply 1000000

const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));

async function main(){
  const rpc = argv.rpc || process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const keypairPath = argv.keypair || process.env.SOLANA_KEYPAIR_PATH;
  const decimals = parseInt(argv.decimals || process.env.MINT_DECIMALS || '9');
  const supply = argv.supply || process.env.MINT_INITIAL_SUPPLY || '1000000';

  if(!keypairPath){
    console.error('Provide --keypair <path> or set SOLANA_KEYPAIR_PATH in .env');
    process.exit(1);
  }

  const secret = JSON.parse(fs.readFileSync(keypairPath));
  const payer = Keypair.fromSecretKey(Buffer.from(secret));
  const connection = new Connection(rpc, 'confirmed');

  console.log('Payer:', payer.publicKey.toBase58());

  // Airdrop on devnet (if using devnet)
  if(rpc.includes('devnet')){
    const airdropSig = await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSig);
    console.log('Airdropped 2 SOL to payer (devnet)');
  }

  // Create mint
  const mint = await splToken.createMint(
    connection,
    payer, // payer
    payer.publicKey, // mint authority
    null, // freeze authority
    decimals
  );

  console.log('Created mint:', mint.toBase58());

  // Create token account for payer
  const payerTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
    connection, payer, mint, payer.publicKey
  );

  // Mint initial supply (supply is in whole tokens; convert to smallest unit)
  const amount = BigInt(supply) * (BigInt(10) ** BigInt(decimals));
  await splToken.mintTo(
    connection,
    payer,
    mint,
    payerTokenAccount.address,
    payer,
    amount
  );

  console.log('Minted', supply, 'tokens to', payerTokenAccount.address.toBase58());
  console.log('Mint address:', mint.toBase58());
}

main().catch(err => { console.error(err); process.exit(1); });