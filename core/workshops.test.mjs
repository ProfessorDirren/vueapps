import test from 'node:test';
import assert from 'node:assert/strict';
import {workshopQuery} from './workshops.js';
test('workshop searches distinguish cars, motorcycles and towing without transmitting symptoms',()=>{assert.equal(workshopQuery('motorcycle',' Tyresö '),'motorcycle repair workshop Tyresö');assert.equal(workshopQuery('car','135 40'),'car repair workshop 135 40');assert.match(workshopQuery('motorcycle','Stockholm','roadside'),/motorcycle roadside assistance towing/);assert.throws(()=>workshopQuery('boat','Tyresö'));assert.throws(()=>workshopQuery('car',''));assert.throws(()=>workshopQuery('car','x'.repeat(121)))});
