package com.desk_sharing;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.stereotype.Component;
import org.springframework.lang.NonNull;

@Component
public class BeanCreationLogger implements BeanPostProcessor {
    private static final String BASE_PACKAGE = "com.desk_sharing";
    @Override
    public Object postProcessBeforeInitialization(@NonNull Object bean, @NonNull String beanName) throws BeansException {
        String className = bean.getClass().getName();
        if (className.startsWith(BASE_PACKAGE)) {
            System.out.println("➡️ Bean erstellt: " + beanName + " -> " + className);
        }
        return bean;
    }

    @Override
    public Object postProcessAfterInitialization(@NonNull Object bean, @NonNull String beanName) throws BeansException {
        return bean;
    }
}