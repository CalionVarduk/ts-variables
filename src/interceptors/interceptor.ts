import { UnorderedMap } from 'frl-ts-utils/lib/collections';
import { Assert, isNull, reinterpretCast, isPrimitiveOfType } from 'frl-ts-utils/lib/functions';
import { MethodKeyOf, toDeepReadonly, PropertyKeyOf, DeepReadonly, ExtractDelegate } from 'frl-ts-utils/lib/types';
import { UpdateRef } from '../update-ref';
import { FunctionInterceptionParams } from './create-intercepted-function';
import { PropertyInterceptionParams, createInterceptedProperty } from './create-intercepted-property';
import { createInterceptedMethod } from './create-intercepted-method';

export class Interceptor<T>
{
    public get interceptedMemberCount(): number
    {
        return this._interceptedMembers.length;
    }

    public readonly subject: T;
    private readonly _interceptedMembers: UnorderedMap<keyof T, UpdateRef<PropertyDescriptor | Function>>;

    public constructor(subject: T)
    {
        this.subject = Assert.IsDefined(subject, 'subject');
        this._interceptedMembers = new UnorderedMap<keyof T, UpdateRef<PropertyDescriptor | Function>>();
    }

    public addMethod<TMethodKey extends MethodKeyOf<T>>(
        methodKey: TMethodKey,
        params: FunctionInterceptionParams<ExtractDelegate<T[TMethodKey]>, T>):
        this
    {
        if (this._interceptedMembers.has(reinterpretCast<DeepReadonly<keyof T>>(methodKey)))
            throw new Error(`'${methodKey}' method has already been registered.`);

        const descriptors = createInterceptedMethod(this.subject, methodKey, params);
        this._interceptedMembers.set(reinterpretCast<DeepReadonly<keyof T>>(methodKey), descriptors);
        return this;
    }

    public addProperty<TPropertyKey extends PropertyKeyOf<T>>(
        propertyKey: TPropertyKey,
        params: PropertyInterceptionParams<T, TPropertyKey>):
        this
    {
        if (this._interceptedMembers.has(reinterpretCast<DeepReadonly<keyof T>>(propertyKey)))
            throw new Error(`'${propertyKey}' property has already been registered.`);

        const descriptors = createInterceptedProperty(this.subject, propertyKey, params);
        if (descriptors.hasChanged)
            this._interceptedMembers.set(reinterpretCast<DeepReadonly<keyof T>>(propertyKey), descriptors);

        return this;
    }

    public resetMember(memberKey: keyof T): this
    {
        const descriptors = this._interceptedMembers.tryGet(toDeepReadonly(memberKey));
        if (isNull(descriptors))
            throw new Error(`${memberKey} member hasn't been registered.`);

        if (isPrimitiveOfType('function', descriptors.oldValue))
            this.subject[memberKey] = reinterpretCast<T[keyof T]>(descriptors.oldValue);
        else
            Object.defineProperty(this.subject, memberKey, descriptors.oldValue);

        this._interceptedMembers.delete(toDeepReadonly(memberKey));
        return this;
    }

    public clear(): void
    {
        for (const entry of this._interceptedMembers)
        {
            if (isPrimitiveOfType('function', entry.value.oldValue))
                this.subject[entry.key] = reinterpretCast<T[DeepReadonly<keyof T>]>(entry.value.oldValue);
            else
                Object.defineProperty(this.subject, entry.key, entry.value.oldValue);
        }
        this._interceptedMembers.clear();
    }

    public interceptedMemberNames(): Iterable<keyof T>
    {
        return this._interceptedMembers.keys();
    }
}
