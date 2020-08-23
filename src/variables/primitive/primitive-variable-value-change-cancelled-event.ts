import { Nullable, DeepReadonly } from 'frl-ts-utils/lib/types';
import { PrimitiveVariableValueChangeCancellationReason } from './primitive-variable-value-change-cancellation-reason.enum';

export class PrimitiveVariableValueChangeCancelledEvent<T = any>
{
    public readonly originalValue: Nullable<DeepReadonly<T>>;
    public readonly currentValue: Nullable<DeepReadonly<T>>;
    public readonly cancelledValue: Nullable<DeepReadonly<T>>;
    public readonly reason: PrimitiveVariableValueChangeCancellationReason;

    public constructor(
        originalValue: Nullable<DeepReadonly<T>>,
        currentValue: Nullable<DeepReadonly<T>>,
        cancelledValue: Nullable<DeepReadonly<T>>,
        reason: PrimitiveVariableValueChangeCancellationReason)
    {
        this.originalValue = originalValue;
        this.currentValue = currentValue;
        this.cancelledValue = cancelledValue;
        this.reason = reason;
    }
}
