import { expect } from 'chai';

// Importe la fonction à tester
import { identity } from '../src/core.identity';

describe('user', () => {
  it('gen deterministic hidden user identity (name@host)=>{public,private}', async () => {
    const username = 'olivier@patate.ch';
    const id = await identity(username);
    // console.log('id.pub',id.pub);
    // console.log('id.priv',id.priv);      
  });
});
