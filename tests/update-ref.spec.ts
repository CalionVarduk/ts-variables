import { UpdateRef } from '../src/update-ref';
import each from 'jest-each';

each([
 [1, 1, false],
 [1, 2, true],
 [null, 'foo', true],
 ['foo', void(0), true],
 [{}, {}, true]
])
.test('ctor should create properly (%#): value: %o, oldValue: %o, hasChanged: %s',
    (value: any, oldValue: any, hasChanged: boolean) =>
    {
        const sut = new UpdateRef(value, oldValue);
        const result = sut.hasChanged;
        expect(result).toBe(hasChanged);
    }
);
