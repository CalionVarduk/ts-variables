import { PropertyKeyOf, Delegate, makeRef } from 'frl-ts-utils/lib/types';
import { Assert, isDefined, isUndefined } from 'frl-ts-utils/lib/functions';
import { FunctionInterceptionParams, createInterceptedFunction } from './create-intercepted-function';
import { UpdateRef } from '../update-ref';

function defineProperty<
    TThat,
    TPropertyKey extends PropertyKeyOf<TThat>>(
    that: TThat,
    propertyKey: TPropertyKey,
    descriptor: PropertyDescriptor,
    params: PropertyInterceptionParams<TThat, TPropertyKey>):
    void
{
    const getter = descriptor.get!;
    const setter = descriptor.set!;

    Object.defineProperty(that, propertyKey,
        {
            get: isUndefined(params.getterParams) ? getter : createInterceptedFunction(getter, that, params.getterParams),
            set: isUndefined(params.setterParams) ? setter : createInterceptedFunction(setter, that, params.setterParams),
            configurable: descriptor.configurable,
            enumerable: descriptor.enumerable,
            writable: descriptor.writable
        });
}

function defineReadonlyProperty<
    TThat,
    TPropertyKey extends PropertyKeyOf<TThat>>(
    that: TThat,
    propertyKey: TPropertyKey,
    descriptor: PropertyDescriptor,
    getterParams?: FunctionInterceptionParams<Delegate<[], TThat[TPropertyKey]>, TThat>):
    void
{
    if (isUndefined(getterParams))
        return;

    const getter = descriptor.get!;

    Object.defineProperty(that, propertyKey,
        {
            get: createInterceptedFunction(getter, that, getterParams),
            configurable: descriptor.configurable,
            enumerable: descriptor.enumerable,
            writable: descriptor.writable
        });
}

function defineWriteonlyProperty<
    TThat,
    TPropertyKey extends PropertyKeyOf<TThat>>(
    that: TThat,
    propertyKey: TPropertyKey,
    descriptor: PropertyDescriptor,
    setterParams?: FunctionInterceptionParams<Delegate<[TThat[TPropertyKey]], void>, TThat>):
    void
{
    if (isUndefined(setterParams))
        return;

    const setter = descriptor.set!;

    Object.defineProperty(that, propertyKey,
        {
            set: createInterceptedFunction(setter, that, setterParams),
            configurable: descriptor.configurable,
            enumerable: descriptor.enumerable,
            writable: descriptor.writable
        });
}

function defineField<
    TThat,
    TPropertyKey extends PropertyKeyOf<TThat>>(
    that: TThat,
    propertyKey: TPropertyKey,
    descriptor: PropertyDescriptor,
    params: PropertyInterceptionParams<TThat, TPropertyKey>):
    void
{
    const valueRef = makeRef<TThat[TPropertyKey]>(descriptor.value);
    const getter = () => valueRef.value;
    const setter = (value: TThat[TPropertyKey]) => { valueRef.value = value; };

    Object.defineProperty(that, propertyKey,
        {
            get: isUndefined(params.getterParams) ? getter : createInterceptedFunction(getter, that, params.getterParams),
            set: isUndefined(params.setterParams) ? setter : createInterceptedFunction(setter, that, params.setterParams),
            configurable: descriptor.configurable,
            enumerable: descriptor.enumerable
        });
}

export type PropertyInterceptionParams<TThat, TPropertyKey extends PropertyKeyOf<TThat>> =
{
    readonly getterParams?: FunctionInterceptionParams<Delegate<[], TThat[TPropertyKey]>, TThat>;
    readonly setterParams?: FunctionInterceptionParams<Delegate<[TThat[TPropertyKey]], void>, TThat>;
};

export function createInterceptedProperty<
    TThat,
    TPropertyKey extends PropertyKeyOf<TThat>>(
    that: TThat,
    propertyKey: TPropertyKey,
    params: PropertyInterceptionParams<TThat, TPropertyKey>):
    UpdateRef<PropertyDescriptor>
{
    Assert.IsDefined(that, 'that');

    const descriptor = Object.getOwnPropertyDescriptor(that, propertyKey);
    if (!isDefined(descriptor))
        throw new Error(`Failed to find '${propertyKey}' property descriptor.`);

    if (isUndefined(params.getterParams) && isUndefined(params.setterParams))
        return new UpdateRef<PropertyDescriptor>(descriptor, descriptor);

    if (isDefined(descriptor.get))
    {
        if (isDefined(descriptor.set))
            defineProperty(that, propertyKey, descriptor, params);
        else
            defineReadonlyProperty(that, propertyKey, descriptor, params.getterParams);
    }
    else if (isDefined(descriptor.set))
        defineWriteonlyProperty(that, propertyKey, descriptor, params.setterParams);
    else
        defineField(that, propertyKey, descriptor, params);

    return new UpdateRef<PropertyDescriptor>(
        Object.getOwnPropertyDescriptor(that, propertyKey)!, descriptor);
}
