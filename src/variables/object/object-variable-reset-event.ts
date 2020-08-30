import { ObjectVariableValue } from './object-variable-value';

export class ObjectVariableResetEvent
{
    public readonly originalValue: ObjectVariableValue;
    public readonly currentValue: ObjectVariableValue;
    public readonly previousValue: ObjectVariableValue;

    public constructor(originalValue: ObjectVariableValue, currentValue: ObjectVariableValue, previousValue: ObjectVariableValue)
    {
        this.originalValue = originalValue;
        this.currentValue = currentValue;
        this.previousValue = previousValue;
    }
}
