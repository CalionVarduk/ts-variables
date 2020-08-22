import { MethodKeyOf } from 'frl-ts-utils/lib/types';
import { Assert, isDefined, isPrimitiveOfType, reinterpretCast } from 'frl-ts-utils/lib/functions';
import { FunctionInterceptionParams, createInterceptedFunction } from './create-intercepted-function';
import { UpdateRef } from '../update-ref';

export function createInterceptedMethod<
    TThat,
    TMethodKey extends MethodKeyOf<TThat>>(
    that: TThat,
    methodKey: TMethodKey,
    params: FunctionInterceptionParams<TThat[TMethodKey], TThat>):
    UpdateRef<PropertyDescriptor>
{
    Assert.IsDefined(that, 'that');

    const descriptor = Object.getOwnPropertyDescriptor(that, methodKey);
    if (!isDefined(descriptor))
        throw new Error(`Failed to find '${methodKey}' method descriptor.`);

    const value = reinterpretCast<TThat[TMethodKey]>(descriptor.value);

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
