import { UnorderedMap } from 'frl-ts-utils/lib/collections';
import { Assert, isNull } from 'frl-ts-utils/lib/functions';
import { MethodKeyOf, toDeepReadonly, PropertyKeyOf } from 'frl-ts-utils/lib/types';
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
    private readonly _interceptedMembers: UnorderedMap<keyof T, UpdateRef<PropertyDescriptor>>;

    public constructor(subject: T)
    {
        this.subject = Assert.IsDefined(subject, 'subject');
        this._interceptedMembers = new UnorderedMap<keyof T, UpdateRef<PropertyDescriptor>>();
    }

    public addMethod<TMethodKey extends MethodKeyOf<T>>(
        methodKey: TMethodKey,
        params: FunctionInterceptionParams<T[TMethodKey], T>):
        this
    {
        if (this._interceptedMembers.has(toDeepReadonly(methodKey)))
            throw new Error(`'${methodKey}' method has already been registered.`);

        const descriptors = createInterceptedMethod(this.subject, methodKey, params);
        this._interceptedMembers.set(toDeepReadonly(methodKey), descriptors);
        return this;
    }

    public addProperty<TPropertyKey extends PropertyKeyOf<T>>(
        propertyKey: TPropertyKey,
        params: PropertyInterceptionParams<T, TPropertyKey>):
        this
    {
        if (this._interceptedMembers.has(toDeepReadonly(propertyKey)))
            throw new Error(`'${propertyKey}' property has already been registered.`);

        const descriptors = createInterceptedProperty(this.subject, propertyKey, params);
        if (descriptors.hasChanged)
            this._interceptedMembers.set(toDeepReadonly(propertyKey), descriptors);

        return this;
    }

    public resetMember(memberKey: keyof T): this
    {
        const descriptors = this._interceptedMembers.tryGet(toDeepReadonly(memberKey));
        if (isNull(descriptors))
            throw new Error(`${memberKey} member hasn't been registered.`);

        Object.defineProperty(this.subject, memberKey, descriptors.oldValue);
        this._interceptedMembers.delete(toDeepReadonly(memberKey));
        return this;
    }

    public clear(): void
    {
        for (const entry of this._interceptedMembers)
            Object.defineProperty(this.subject, entry.key, entry.value.oldValue);

        this._interceptedMembers.clear();
    }

    public interceptedMemberNames(): Iterable<keyof T>
    {
        return this._interceptedMembers.keys();
    }
}
