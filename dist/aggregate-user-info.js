"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateUserInfo = void 0;
const OTHER_COLOR = '#444444';
const toNumberContributionLevel = (level) => {
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
const compare = (num1, num2) => {
    if (num1 < num2) {
        return -1;
    }
    else if (num1 > num2) {
        return 1;
    }
    else {
        return 0;
    }
};
const aggregateUserInfo = (response) => {
    if (!response.data) {
        if (response.errors && response.errors.length) {
            throw new Error(response.errors[0].message);
        }
        else {
            throw new Error('JSON\n' + JSON.stringify(response, null, 2));
        }
    }
    const user = response.data.user;
    const calendar = user.contributionsCollection.contributionCalendar.weeks
        .flatMap((week) => week.contributionDays)
        .map((week) => ({
        contributionCount: week.contributionCount,
        contributionLevel: toNumberContributionLevel(week.contributionLevel),
        date: new Date(week.date),
    }));
    const contributesLanguage = {};
    const addLanguage = (language, color, contributions) => {
        const info = contributesLanguage[language];
        if (info) {
            info.contributions += contributions;
        }
        else {
            contributesLanguage[language] = {
                language: language,
                color: color,
                contributions: contributions,
            };
        }
    };
    user.contributionsCollection.commitContributionsByRepository.forEach((repo) => {
        var _a;
        const commits = repo.contributions.totalCount;
        const languageEdges = ((_a = repo.repository.languages) === null || _a === void 0 ? void 0 : _a.edges) || [];
        const languageItems = languageEdges
            .filter((edge) => edge && edge.node && edge.node.name)
            .map((edge) => ({
            name: edge.node.name,
            color: edge.node.color || OTHER_COLOR,
            size: edge.size,
        }));
        if (languageItems.length > 0) {
            const totalSize = languageItems.reduce((sum, item) => sum + item.size, 0);
            if (totalSize > 0) {
                languageItems.forEach((item) => {
                    addLanguage(item.name, item.color, (commits * item.size) / totalSize);
                });
                return;
            }
        }
        if (repo.repository.primaryLanguage) {
            const language = repo.repository.primaryLanguage.name;
            const color = repo.repository.primaryLanguage.color || OTHER_COLOR;
            addLanguage(language, color, commits);
        }
    });
    const languages = Object.values(contributesLanguage).sort((obj1, obj2) => -compare(obj1.contributions, obj2.contributions));
    const totalForkCount = user.repositories.nodes
        .map((node) => node.forkCount)
        .reduce((num1, num2) => num1 + num2, 0);
    const totalStargazerCount = user.repositories.nodes
        .map((node) => node.stargazerCount)
        .reduce((num1, num2) => num1 + num2, 0);
    const userInfo = {
        isHalloween: user.contributionsCollection.contributionCalendar.isHalloween,
        contributionCalendar: calendar,
        contributesLanguage: languages,
        totalContributions: user.contributionsCollection.contributionCalendar
            .totalContributions,
        totalCommitContributions: user.contributionsCollection.totalCommitContributions,
        totalIssueContributions: user.contributionsCollection.totalIssueContributions,
        totalPullRequestContributions: user.contributionsCollection.totalPullRequestContributions,
        totalPullRequestReviewContributions: user.contributionsCollection.totalPullRequestReviewContributions,
        totalRepositoryContributions: user.contributionsCollection.totalRepositoryContributions,
        totalForkCount: totalForkCount,
        totalStargazerCount: totalStargazerCount,
    };
    return userInfo;
};
exports.aggregateUserInfo = aggregateUserInfo;
//# sourceMappingURL=aggregate-user-info.js.map