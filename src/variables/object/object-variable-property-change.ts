import { Nullable } from 'frl-ts-utils/lib/types';
import { ObjectVariablePropertyChangeType } from './object-variable-property-change-type.enum';
import { MapEntry } from 'frl-ts-utils/lib/collections';
import { IVariable } from '../variable.interface';

export class ObjectVariablePropertyChange
{
    public readonly changeType: ObjectVariablePropertyChangeType;
    public readonly name: string;
    public readonly originalValue: any;
    public readonly currentValue: any;
    public readonly propertyChanges: Nullable<object>;

    public constructor(
        changeType: ObjectVariablePropertyChangeType,
        property: MapEntry<string, IVariable>)
    {
        this.changeType = changeType;
        this.name = property.key;
        this.originalValue = property.value.changeTracker.originalValue;
        this.currentValue = property.value.value;
        this.propertyChanges = property.value.changeTracker.changes;
    }
}
