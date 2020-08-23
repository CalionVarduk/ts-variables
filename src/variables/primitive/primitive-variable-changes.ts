import { Nullable, DeepReadonly } from 'frl-ts-utils/lib/types';

export class PrimitiveVariableChanges<T = any>
{
    public readonly originalValue: Nullable<DeepReadonly<T>>;
    public readonly currentValue: Nullable<DeepReadonly<T>>;

    public constructor(originalValue: Nullable<DeepReadonly<T>>, currentValue: Nullable<DeepReadonly<T>>)
    {
        this.originalValue = originalValue;
        this.currentValue = currentValue;
    }
}
