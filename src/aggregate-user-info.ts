import * as client from './github-graphql';
import * as type from './type';

const OTHER_COLOR = '#444444';

const toNumberContributionLevel = (level: type.ContributionLevel): number => {
    switch (level) {
        case 'NONE':
            return 0;
        case 'FIRST_QUARTILE':
            return 1;
        case 'SECOND_QUARTILE':
            return 2;
        case 'THIRD_QUARTILE':
            return 3;
        case 'FOURTH_QUARTILE':
            return 4;
    }
};

const compare = (num1: number, num2: number): number => {
    if (num1 < num2) {
        return -1;
    } else if (num1 > num2) {
        return 1;
    } else {
        return 0;
    }
};

export const aggregateUserInfo = (
    response: client.ResponseType,
): type.UserInfo => {
    if (!response.data) {
        if (response.errors && response.errors.length) {
            throw new Error(response.errors[0].message);
        } else {
            throw new Error('JSON\n' + JSON.stringify(response, null, 2));
        }
    }

    const user = response.data.user;
    const calendar = user.contributionsCollection.contributionCalendar.weeks
        .flatMap((week) => week.contributionDays)
        .map((week) => ({
            contributionCount: week.contributionCount,
            contributionLevel: toNumberContributionLevel(
                week.contributionLevel,
            ),
            date: new Date(week.date),
        }));
    const contributesLanguage: { [language: string]: type.LangInfo } = {};
    const addLanguage = (
        language: string,
        color: string,
        contributions: number,
    ) => {
        const info = contributesLanguage[language];
        if (info) {
            info.contributions += contributions;
        } else {
            contributesLanguage[language] = {
                language: language,
                color: color,
                contributions: contributions,
            };
        }
    };

    user.contributionsCollection.commitContributionsByRepository.forEach(
        (repo) => {
            const commits = repo.contributions.totalCount;
            const languageEdges = repo.repository.languages?.edges || [];
            const languageItems = languageEdges
                .filter((edge) => edge && edge.node && edge.node.name)
                .map((edge) => ({
                    name: edge.node!.name,
                    color: edge.node!.color || OTHER_COLOR,
                    size: edge.size,
                }));

            if (languageItems.length > 0) {
                const totalSize = languageItems.reduce(
                    (sum, item) => sum + item.size,
                    0,
                );
                if (totalSize > 0) {
                    languageItems.forEach((item) => {
                        addLanguage(
                            item.name,
                            item.color,
                            (commits * item.size) / totalSize,
                        );
                    });
                    return;
                }
            }

            if (repo.repository.primaryLanguage) {
                const language = repo.repository.primaryLanguage.name;
                const color = repo.repository.primaryLanguage.color || OTHER_COLOR;
                addLanguage(language, color, commits);
            }
        },
    );
    const languages: Array<type.LangInfo> = Object.values(
        contributesLanguage,
    ).sort((obj1, obj2) => -compare(obj1.contributions, obj2.contributions));

    const totalForkCount = user.repositories.nodes
        .map((node) => node.forkCount)
        .reduce((num1, num2) => num1 + num2, 0);
    const totalStargazerCount = user.repositories.nodes
        .map((node) => node.stargazerCount)
        .reduce((num1, num2) => num1 + num2, 0);
    const userInfo: type.UserInfo = {
        isHalloween:
            user.contributionsCollection.contributionCalendar.isHalloween,
        contributionCalendar: calendar,
        contributesLanguage: languages,
        totalContributions:
            user.contributionsCollection.contributionCalendar
                .totalContributions,
        totalCommitContributions:
            user.contributionsCollection.totalCommitContributions,
        totalIssueContributions:
            user.contributionsCollection.totalIssueContributions,
        totalPullRequestContributions:
            user.contributionsCollection.totalPullRequestContributions,
        totalPullRequestReviewContributions:
            user.contributionsCollection.totalPullRequestReviewContributions,
        totalRepositoryContributions:
            user.contributionsCollection.totalRepositoryContributions,
        totalForkCount: totalForkCount,
        totalStargazerCount: totalStargazerCount,
    };
    return userInfo;
};
