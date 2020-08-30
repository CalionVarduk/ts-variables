import { MethodKeyOf, ExtractDelegate } from 'frl-ts-utils/lib/types';
import { Assert, isDefined, isPrimitiveOfType, reinterpretCast } from 'frl-ts-utils/lib/functions';
import { FunctionInterceptionParams, createInterceptedFunction } from './create-intercepted-function';
import { UpdateRef } from '../update-ref';

export function createInterceptedMethod<
    TThat,
    TMethodKey extends MethodKeyOf<TThat>>(
    that: TThat,
    methodKey: TMethodKey,
    params: FunctionInterceptionParams<ExtractDelegate<TThat[TMethodKey]>, TThat>):
    UpdateRef<PropertyDescriptor | Function>
{
    Assert.IsDefined(that, 'that');

    const descriptor = Object.getOwnPropertyDescriptor(that, methodKey);
    if (isDefined(descriptor))
    {
        const value = reinterpretCast<ExtractDelegate<TThat[TMethodKey]>>(descriptor.value);

        if (!isDefined(value) || !isPrimitiveOfType('function', value))
            throw new Error(`'${methodKey}' method descriptor's value is not a function.`);

        Object.defineProperty(that, methodKey,
            {
                value: createInterceptedFunction(value, that, params),
                configurable: descriptor.configurable,
                enumerable: descriptor.enumerable,
                writable: descriptor.writable
            });

        return new UpdateRef<PropertyDescriptor>(
            Object.getOwnPropertyDescriptor(that, methodKey)!, descriptor);
    }
    {
        const value = reinterpretCast<ExtractDelegate<TThat[TMethodKey]>>(that[methodKey]);
        if (!isDefined(value))
            throw new Error(`Failed to find '${methodKey}' method descriptor.`);
        if (!isPrimitiveOfType('function', value))
            throw new Error(`'${methodKey}' method descriptor's value is not a function.`);

        Object.defineProperty(that, methodKey,
            {
                value: createInterceptedFunction(value, that, params),
                configurable: true,
                enumerable: true,
                writable: true
            });

        return new UpdateRef<PropertyDescriptor | Function>(
            Object.getOwnPropertyDescriptor(that, methodKey)!, value);
    }
}
