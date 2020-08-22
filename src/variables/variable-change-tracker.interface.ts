import { Nullable } from 'frl-ts-utils/lib/types';
import { IEvent } from 'frl-ts-utils/lib/events';
import { VariableChangeEvent } from './variable-change-event';

export interface IVariableChangeTracker<T = any>
{
    readonly hasChanged: boolean;
    readonly isAttached: boolean;
    readonly originalValue: T;
    readonly changes: Nullable<object>;
    readonly onChange: IEvent<VariableChangeEvent>;

    areEqual(first: T, second: T): boolean;
    detach(): void;
    attach(): void;
    detectChanges(): void;
}
