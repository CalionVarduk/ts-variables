import { Nullable, DeepReadonly } from 'frl-ts-utils/lib/types';
import { PrimitiveVariableValueChangeSource } from './primitive-variable-value-change-source.enum';

export class PrimitiveVariableValueChangedEvent<T = any>
{
    public readonly originalValue: Nullable<DeepReadonly<T>>;
    public readonly previousValue: Nullable<DeepReadonly<T>>;
    public readonly currentValue: Nullable<DeepReadonly<T>>;
    public readonly changeSource: PrimitiveVariableValueChangeSource;

    public constructor(
        originalValue: Nullable<DeepReadonly<T>>,
        previousValue: Nullable<DeepReadonly<T>>,
        currentValue: Nullable<DeepReadonly<T>>,
        changeSource: PrimitiveVariableValueChangeSource)
    {
        this.originalValue = originalValue;
        this.previousValue = previousValue;
        this.currentValue = currentValue;
        this.changeSource = changeSource;
    }
}
