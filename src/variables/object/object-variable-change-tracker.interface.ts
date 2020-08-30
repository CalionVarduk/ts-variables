import { MapEntry } from 'frl-ts-utils/lib/collections';
import { IVariableChangeTracker } from '../variable-change-tracker.interface';
import { ObjectVariableValue } from './object-variable-value';
import { ObjectVariableChanges } from './object-variable-changes.abstract';
import { IVariable } from '../variable.interface';

export interface IObjectVariableChangeTracker
    extends
    IVariableChangeTracker<ObjectVariableValue>
{
    readonly changes: ObjectVariableChanges;

    getChangedProperties(): Iterable<MapEntry<string, IVariable>>;
    getUnchagedProperties(): Iterable<MapEntry<string, IVariable>>;
}
