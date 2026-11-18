export type ActivePoll = {
  id: number;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  myVoteOptionId: number | null;
  options: Array<{ id: number; label: string; voteCount: number }>;
};

export type PollVoteResult = {
  optionId: number;
  alreadyVoted: boolean;
};

export function applyPollVoteResult(
  current: ActivePoll | null | undefined,
  pollId: number,
  result: PollVoteResult,
): ActivePoll | null | undefined {
  if (!current || current.id !== pollId) return current;

  return {
    ...current,
    myVoteOptionId: result.optionId,
    options: result.alreadyVoted
      ? current.options
      : current.options.map((option) => (
        option.id === result.optionId
          ? { ...option, voteCount: Number(option.voteCount) + 1 }
          : option
      )),
  };
}

export function getDisplayedPoll(
  poll: ActivePoll,
  result?: PollVoteResult,
): Pick<ActivePoll, "myVoteOptionId" | "options"> {
  const shouldApplyResultCount = Boolean(
    result && !result.alreadyVoted && poll.myVoteOptionId === null,
  );

  return {
    myVoteOptionId: result?.optionId ?? poll.myVoteOptionId,
    options: shouldApplyResultCount
      ? poll.options.map((option) => (
        option.id === result?.optionId
          ? { ...option, voteCount: Number(option.voteCount) + 1 }
          : option
      ))
      : poll.options,
  };
}
