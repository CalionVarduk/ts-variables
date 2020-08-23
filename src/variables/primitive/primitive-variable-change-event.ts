import { Nullable } from 'frl-ts-utils/lib/types';
import { reinterpretCast } from 'frl-ts-utils/lib/functions';
import { VariableChangeEvent } from '../variable-change-event';
import { PrimitiveVariableChanges } from './primitive-variable-changes';
import { PrimitiveVariableValueChangedEvent } from './primitive-variable-value-changed-event';

export class PrimitiveVariableChangeEvent<T = any>
    extends
    VariableChangeEvent
{
    public get source(): Nullable<PrimitiveVariableValueChangedEvent<T>>
    {
        return reinterpretCast<Nullable<PrimitiveVariableValueChangedEvent<T>>>(super.source);
    }
    public get change(): Nullable<PrimitiveVariableChanges<T>>
    {
        return reinterpretCast<Nullable<PrimitiveVariableChanges<T>>>(super.change);
    }

    public constructor(
        change: Nullable<PrimitiveVariableChanges<T>>,
        source: Nullable<PrimitiveVariableValueChangedEvent<T>> = null)
    {
        super(change, source);
    }
}
