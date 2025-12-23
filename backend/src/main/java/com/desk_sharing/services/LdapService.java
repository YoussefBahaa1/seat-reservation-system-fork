package com.desk_sharing.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.springframework.ldap.CommunicationException;
import org.springframework.ldap.NamingException;
import org.springframework.ldap.UncategorizedLdapException;
import org.springframework.ldap.core.AttributesMapper;
import org.springframework.ldap.core.LdapTemplate;
import org.springframework.stereotype.Service;

import com.desk_sharing.config.LdapProperties;

import lombok.AllArgsConstructor;

import static org.springframework.ldap.query.LdapQueryBuilder.query;
import javax.naming.directory.Attributes;
import javax.naming.directory.Attribute;
import javax.naming.NamingEnumeration;

@Service
@AllArgsConstructor
public class LdapService {
    private final LdapTemplate ldapTemplate;
    private final LdapProperties ldapProperties;
    
    /**
     * Check if an user with an specified email exists in AD.
     * 
     * @param email The email that we want to check if it exists in AD.
     * @return True iff the email exists for an user in AD. False otherwise. Also false if LDAP_DIR_CONTEXT_URL is not or wrong set.
     */
    public boolean userExistsByEmail(final String email) {
        try {
            final List<Boolean> results = ldapTemplate.search(
                query()
                    .base(ldapProperties.getUserBase())  // relative Base zur contextSource
                    .where("objectClass").is("user")
                    .and("mail").is(email),
                (Attributes attrs) -> true
            );
            return !results.isEmpty();
        } catch (
            UncategorizedLdapException | // LDAP_DIR_CONTEXT_URL empty
            CommunicationException e // LDAP_DIR_CONTEXT_URL misformed
            ) {
            return false;
        }
    }

    /**
     * Pulls all groups from ad that the user, which is identified by email, is an memberOf.
     * @param email The email that identifies the user.
     * @return  An list of all groups the user with email is memberOf. 
     */
    public List<String> getUserGroupsByEmail(String email) {
        final List<String> userGroupsByEmail = ldapTemplate.search(
            query()
            .base(ldapProperties.getUserBase())
                .filter(ldapProperties.getUserFilter(), email),
            (Attributes attrs) -> {
                Attribute memberOf = attrs.get("memberOf");
                List<String> groups = new ArrayList<>();
                if (memberOf != null) {
                    NamingEnumeration<?> all = memberOf.getAll();
                    while (all.hasMore()) {
                        groups.add(all.next().toString());
                    }
                }
                return groups;
            }
        ).stream().flatMap(List::stream).toList();
        return userGroupsByEmail;
    }

    /**
     * Search all email addresses of the users that belongs to group with the distinguishedName groupDn.
     * 
     * @param groupDn The distinguished name of the group we like to get the member emails.
     * @return A list of all emails from the members of the group with the distinguishedName groupDn.
     */
    public List<String> getGroupMembersEmails(String groupDn) {
        /*
        Fetch all user dns that belongs that are members of the group groupDn.
        Unfortunately the distinguished names are absolut. 
        This makes it difficult to search for the emails for this users because ldapTemplate.lookup()
        works relative to the already set base. 
        Solution: Cut off named base from the dn's.
        */
        final List<String> memberDns = ldapTemplate.search(
            query().base(ldapProperties.getGroupBase()).filter(ldapProperties.getGroupFilter(), groupDn),
            (Attributes attrs) -> {
                List<String> members = new ArrayList<>();
                Attribute memberAttr = attrs.get("member");
                if (memberAttr != null) {
                    try {
                        NamingEnumeration<?> all = memberAttr.getAll();
                        while (all.hasMore()) {
                            members.add(all.next().toString());
                        }
                    } catch (NamingException e) {
                        e.printStackTrace();
                    }
                }
                return members;
            }
        ).stream().flatMap(List::stream).toList();
        
        // The dn per user without the base. This makes the user dn relative instead of absolute.
        final List<String> cuttedMemberDns = 
            memberDns.stream()
            // Rm the overall base. E.g.:
            // CN=Mustermann\, Max,OU=Users,OU=lit,OU=Justiz,DC=justiz,DC=sachsen,DC=de -> CN=Mustermann\, Max,OU=Users,OU=lit,OU=Justiz
            .map(memberDn -> memberDn.replace(","+ldapProperties.getBase(), ""))
            .toList();
        
        // The emails.
        final List<String> emails = new ArrayList<>();
        /*
            Fetch the email address per cutted dn.
            Since ldapTemplate.lookup() works relative to the base, we had to
            cut off the base in the memberDn. If we had not done this we would have
            the base twice in the final lookup. 
        */
        for (final String cuttedMemberDn: cuttedMemberDns) {
            final String email = ldapTemplate.lookup(cuttedMemberDn, (AttributesMapper<String>) attrs -> {
                if (attrs.get("mail") != null) {
                    return (String) attrs.get("mail").get();
                }
                return null;
            });
            emails.add(email);
        }
        // If some entry is null remove it.
        emails.removeIf(Objects::isNull);

        return emails;
    }
}
