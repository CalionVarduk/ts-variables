import { IReadonlyKeyedCollection } from 'frl-ts-utils/lib/collections';
import { CollectionVariableRecreateCancellationReason } from './collection-variable-recreate-cancellation-reason.enum';

export class CollectionVariableRecreateCancelledEvent<TKey = any, TElement = any>
{
    public readonly originalValue: IReadonlyKeyedCollection<TKey, TElement>;
    public readonly currentValue: IReadonlyKeyedCollection<TKey, TElement>;
    public readonly cancelledValue: IReadonlyKeyedCollection<TKey, TElement>;
    public readonly reason: CollectionVariableRecreateCancellationReason;

    public constructor(
        originalValue: IReadonlyKeyedCollection<TKey, TElement>,
        currentValue: IReadonlyKeyedCollection<TKey, TElement>,
        cancelledValue: IReadonlyKeyedCollection<TKey, TElement>,
        reason: CollectionVariableRecreateCancellationReason)
    {
        this.originalValue = originalValue;
        this.currentValue = currentValue;
        this.cancelledValue = cancelledValue;
        this.reason = reason;
    }
}
