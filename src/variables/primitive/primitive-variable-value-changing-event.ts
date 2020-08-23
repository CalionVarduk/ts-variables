import { Nullable, DeepReadonly } from 'frl-ts-utils/lib/types';

export class PrimitiveVariableValueChangingEvent<T = any>
{
    public readonly originalValue: Nullable<DeepReadonly<T>>;
    public readonly currentValue: Nullable<DeepReadonly<T>>;
    public readonly nextValue: Nullable<DeepReadonly<T>>;
    public cancel: boolean;

    public constructor(
        originalValue: Nullable<DeepReadonly<T>>,
        currentValue: Nullable<DeepReadonly<T>>,
        nextValue: Nullable<DeepReadonly<T>>)
    {
        this.originalValue = originalValue;
        this.currentValue = currentValue;
        this.nextValue = nextValue;
        this.cancel = false;
    }
}
