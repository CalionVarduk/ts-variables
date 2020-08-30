import { isNull, isUndefined } from 'frl-ts-utils/lib/functions';
import { IReadonlyUnorderedMap, Iteration } from 'frl-ts-utils/lib/collections';
import { IVariable } from '../variable.interface';

export class ObjectVariableValue
{
    public static CreateEmpty(): ObjectVariableValue
    {
        return new ObjectVariableValue();
    }

    public static Create(
        properties: IReadonlyUnorderedMap<string, IVariable>,
        propertyValueSelector: (variable: IVariable) => any):
        ObjectVariableValue
    {
        const result = ObjectVariableValue.CreateEmpty();

        for (const property of properties)
        {
            const variable = property.value;
            Object.defineProperty(result, property.key,
                {
                    get(): any
                    {
                        return propertyValueSelector(variable);
                    },
                    configurable: false,
                    enumerable: true
                });
        }
        return result;
    }

    public static CreateOriginal(
        properties: IReadonlyUnorderedMap<string, IVariable>):
        ObjectVariableValue
    {
        const result = ObjectVariableValue.CreateEmpty();

        for (const property of properties)
        {
            const changeTracker = property.value.changeTracker;
            Object.defineProperty(result, property.key,
                {
                    get(): any
                    {
                        return changeTracker.originalValue;
                    },
                    configurable: false,
                    enumerable: true
                });
        }
        return result;
    }

    public static CreateCurrent(
        properties: IReadonlyUnorderedMap<string, IVariable>):
        ObjectVariableValue
    {
        const result = ObjectVariableValue.CreateEmpty();

        for (const property of properties)
        {
            const variable = property.value;
            Object.defineProperty(result, property.key,
                {
                    get(): any
                    {
                        return variable.value;
                    },
                    configurable: false,
                    enumerable: true
                });
        }
        return result;
    }

    readonly [name: string]: any;

    public equals(
        other: ObjectVariableValue,
        propertyEqualityComparer?: (first: ObjectVariableValue, second: ObjectVariableValue, name: string) => boolean):
        boolean
    {
        if (this === other)
            return true;

        const propertyNames = this.getPropertyNames();
        const otherPropertyNames = other.getPropertyNames();

        if (propertyNames.length !== otherPropertyNames.length)
            return false;

        const matchingPropertyNames = Iteration.ToArray(
            Iteration.FilterNotNull(
                Iteration.FullJoin(
                    propertyNames, n => n,
                    otherPropertyNames, n => n,
                    (f, s) => isNull(f) || isNull(s) ? null : f)));

        if (matchingPropertyNames.length !== propertyNames.length)
            return false;

        if (isUndefined(propertyEqualityComparer))
            propertyEqualityComparer = (f, s, n) =>
                f[n] === s[n];

        for (const propertyName of matchingPropertyNames)
            if (!propertyEqualityComparer(this, other, propertyName))
                return false;

        return true;
    }

    public createSnapshot(): ObjectVariableValue
    {
        const result = ObjectVariableValue.CreateEmpty();

        for (const propertyName of this.getPropertyNames())
            Object.defineProperty(result, propertyName,
                {
                    value: this[propertyName],
                    configurable: false,
                    enumerable: true,
                    writable: false
                });

        return result;
    }

    public getPropertyNames(): string[]
    {
        return Object.getOwnPropertyNames(this);
    }

    public getPropertyCount(): number
    {
        return this.getPropertyNames().length;
    }
}
